const express = require('express');
const router = express.Router();
const { auth } = require('../middlewares/auth');
const Post = require('../models/Post');
const User = require('../models/User');

// Get feed posts
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('savedBy', 'username');

    const total = await Post.countDocuments();

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching feed', error: error.message });
  }
});

// Save a post
router.post('/:postId/save', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if already saved
    if (post.savedBy.includes(req.user._id)) {
      return res.status(400).json({ message: 'Post already saved' });
    }

    // Add to saved posts
    post.savedBy.push(req.user._id);
    await post.save();

    // Add credits for saving
    user.credits += 2;
    await user.save();

    res.json({ message: 'Post saved successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error saving post', error: error.message });
  }
});

// Report a post
router.post('/:postId/report', auth, async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason) {
      return res.status(400).json({ message: 'Reason is required' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    // Check if already reported by this user
    const alreadyReported = post.reportedBy.some(
      report => report.user.toString() === req.user._id.toString()
    );

    if (alreadyReported) {
      return res.status(400).json({ message: 'Post already reported' });
    }

    post.reportedBy.push({
      user: req.user._id,
      reason
    });

    await post.save();
    res.json({ message: 'Post reported successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error reporting post', error: error.message });
  }
});

// Share a post
router.post('/:postId/share', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Increment shares
    post.shares += 1;
    await post.save();

    // Add credits for sharing
    user.credits += 2;
    await user.save();

    res.json({ message: 'Post shared successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sharing post', error: error.message });
  }
});

module.exports = router; 