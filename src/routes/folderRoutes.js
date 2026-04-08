const express = require('express');
const router = express.Router();
const {
  getFolders,
  createFolder,
  updateFolder,
  deleteFolder,
  inviteMember,
  removeMember,
} = require('../controllers/folderController');
const { protect } = require('../middlewares/authMiddleware');
const validateObjectId = require('../middlewares/validateObjectId');

router.use(protect);

router.get('/', getFolders);
router.post('/', createFolder);
router.put('/:id', validateObjectId, updateFolder);
router.delete('/:id', validateObjectId, deleteFolder);
router.post('/:id/invite', validateObjectId, inviteMember);
router.delete('/:id/collaborators/:userId', validateObjectId, removeMember);

module.exports = router;
