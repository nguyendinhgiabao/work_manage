const express = require('express');
const router = express.Router();
const {
  createNotebook,
  getNotebooks,
  updateNotebook,
  deleteNotebook,
  inviteMember,
  removeMember,
} = require('../controllers/notebookController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', createNotebook);
router.get('/', getNotebooks);
router.put('/:id', updateNotebook);
router.delete('/:id', deleteNotebook);
router.post('/:id/invite', inviteMember);
router.delete('/:id/collaborators/:userId', removeMember);

module.exports = router;
