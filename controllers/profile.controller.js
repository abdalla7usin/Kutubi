/**
 * Kutubi - Profile Controller
 */

const profileService = require('../services/profile.service');

async function getProfile(req, res, next) {
  try {
    const { profile, stats } = await profileService.getProfileStats();
    let toastMessage = null;
    if (req.query.toast === 'profile_saved') toastMessage = 'Profile updated successfully';

    res.render('pages/profile', {
      title: 'Profile',
      activeNav: 'profile',
      profile,
      stats,
      toast: toastMessage,
      error: req.query.error
    });
  } catch (err) {
    next(err);
  }
}

async function updateProfile(req, res, next) {
  try {
    const { displayName, bio } = req.body;
    const result = await profileService.updateProfile({ displayName, bio });
    if (!result.success) {
      return res.redirect(303, `/profile?error=${encodeURIComponent(result.error || 'Failed to update profile.')}`);
    }

    res.redirect(303, '/profile?toast=profile_saved');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getProfile,
  updateProfile
};
