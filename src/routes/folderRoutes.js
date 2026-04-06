const express = require('express');
const router = express.Router();
const {
  getFolders,
  createFolder,
  updateFolder,
  inviteMember,
  removeMember,
} = require('../controllers/folderController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.get('/', getFolders);
router.post('/', createFolder);
router.put('/:id', updateFolder);
router.delete('/:id', deleteFolder);
router.post('/:id/invite', inviteMember);
router.delete('/:id/collaborators/:userId', removeMember);

module.exports = router;
