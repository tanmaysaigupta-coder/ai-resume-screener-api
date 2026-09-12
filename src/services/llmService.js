const Groq = require('groq-sdk');

let client = null;
function getClient() {
  if (!client) {
    client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return client;
}

const SYSTEM_PROMPT = `You are a resume screening assistant for a recruiting platform.
Given a job description and a candidate resume, evaluate how well the candidate matches the role.
Respond with STRICT JSON only, no markdown, matching this shape:
{
  "score": <integer 0-100>,
  "verdict": "strong_match" | "possible_match" | "not_a_match",
  "summary": "<2-3 sentence explanation citing specific evidence from the resume>",
  "matched_skills": [<string>],
  "missing_skills": [<string>]
}`;

function buildUserPrompt({ jobTitle, jobDescription, requiredSkills, minExperienceYears, resumeText }) {
  return `Job title: ${jobTitle}
Required skills: ${requiredSkills.join(', ') || 'none specified'}
Minimum experience (years): ${minExperienceYears}

Job description:
${jobDescription}

Candidate resume:
${resumeText}

Evaluate the fit and respond with the JSON object described in the system prompt.`;
}

/**
 * Screens a candidate's resume against a job posting using an LLM.
 * Throws if the LLM call fails or returns content that cannot be parsed.
 */
async function screenResume(job, resumeText) {
  const groq = getClient();
  const completion = await groq.chat.completions.create({
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    temperature: 0.2,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: buildUserPrompt({
          jobTitle: job.title,
          jobDescription: job.description,
          requiredSkills: job.required_skills || [],
          minExperienceYears: job.min_experience_years || 0,
          resumeText,
        }),
      },
    ],
  });

  const raw = completion.choices?.[0]?.message?.content;
  if (!raw) throw new Error('LLM returned an empty response');

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    throw new Error('LLM returned content that could not be parsed as JSON');
  }

  const score = Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0)));
  const verdict = ['strong_match', 'possible_match', 'not_a_match'].includes(parsed.verdict)
    ? parsed.verdict
    : 'possible_match';

  return {
    score,
    verdict,
    summary: parsed.summary || '',
    matchedSkills: Array.isArray(parsed.matched_skills) ? parsed.matched_skills : [],
    missingSkills: Array.isArray(parsed.missing_skills) ? parsed.missing_skills : [],
  };
}

module.exports = { screenResume };
