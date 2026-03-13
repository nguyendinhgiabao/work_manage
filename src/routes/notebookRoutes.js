const express = require('express');
const router = express.Router();
const {
  createNotebook,
  getNotebooks,
  updateNotebook,
  deleteNotebook,
} = require('../controllers/notebookController');
const { protect } = require('../middlewares/authMiddleware');

router.use(protect);

router.post('/', createNotebook);
router.get('/', getNotebooks);
router.put('/:id', updateNotebook);
router.delete('/:id', deleteNotebook);

module.exports = router;
