const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { createJob, listJobs, getJob } = require('../controllers/jobController');
const {
  addCandidate,
  listCandidates,
  screenCandidate,
} = require('../controllers/candidateController');

const router = express.Router();

router.use(requireAuth);

router.post('/', createJob);
router.get('/', listJobs);
router.get('/:id', getJob);

router.post('/:jobId/candidates', addCandidate);
router.get('/:jobId/candidates', listCandidates);
router.post('/:jobId/candidates/:candidateId/screen', screenCandidate);

module.exports = router;
