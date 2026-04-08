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
const validateObjectId = require('../middlewares/validateObjectId');

router.use(protect);

router.post('/', createNotebook);
router.get('/', getNotebooks);
router.put('/:id', validateObjectId, updateNotebook);
router.delete('/:id', validateObjectId, deleteNotebook);
router.post('/:id/invite', validateObjectId, inviteMember);
router.delete('/:id/collaborators/:userId', validateObjectId, removeMember);

module.exports = router;
