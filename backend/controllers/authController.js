const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AuditTrail = require('../models/AuditTrail');
const { JWT_SECRET } = require('../middleware/auth');
const { uploadBuffer } = require('../config/cloudinary');

function createSessionToken(user, res) {
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role, // role is directly from MongoDB!
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );

  // Set HTTP-Only secure cookie
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  return token;
}

// 1. STUDENT LOGIN
exports.loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Student email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid student credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid student credentials.' });
    }

    // MANDATORY BACKEND ROLE VERIFICATION FROM MONGODB
    if (user.role !== 'STUDENT') {
      return res.status(403).json({
        success: false,
        message: `Account verification failed: This account is registered as '${user.role}', not as a STUDENT. Please use the appropriate login portal.`,
      });
    }

    const token = createSessionToken(user, res);

    await AuditTrail.create({
      user: user._id,
      userName: user.name,
      role: 'STUDENT',
      action: 'LOGIN_STUDENT',
      details: 'Student authenticated successfully via student login portal.',
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Student authentication successful.',
      token,
      redirectUrl: '/student/dashboard',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        cohort: user.cohort,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('loginStudent error:', err);
    return res.status(500).json({ success: false, message: 'Authentication error: ' + (err.message || 'Database error') });
  }
};

// 2. FACULTY LOGIN
exports.loginFaculty = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Faculty email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid faculty credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid faculty credentials.' });
    }

    // MANDATORY BACKEND ROLE VERIFICATION FROM MONGODB
    if (user.role !== 'FACULTY') {
      return res.status(403).json({
        success: false,
        message: `Account verification failed: This account is registered as '${user.role}', not as FACULTY. Please use the appropriate login portal.`,
      });
    }

    const token = createSessionToken(user, res);

    await AuditTrail.create({
      user: user._id,
      userName: user.name,
      role: 'FACULTY',
      action: 'LOGIN_FACULTY',
      details: 'Faculty advisor authenticated successfully.',
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Faculty authentication successful.',
      token,
      redirectUrl: '/faculty/dashboard',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        title: user.title,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('loginFaculty error:', err);
    return res.status(500).json({ success: false, message: 'Authentication error: ' + (err.message || 'Database error') });
  }
};

// 3. ADMIN LOGIN
exports.loginAdmin = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Admin email and password are required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid administrator credentials.' });
    }

    // MANDATORY BACKEND ROLE VERIFICATION FROM MONGODB
    // Frontend can never forge ADMIN role
    if (user.role !== 'ADMIN') {
      return res.status(403).json({
        success: false,
        message: `Security rejection: Account role '${user.role}' is not authorized for institutional administration.`,
      });
    }

    const token = createSessionToken(user, res);

    await AuditTrail.create({
      user: user._id,
      userName: user.name,
      role: 'ADMIN',
      action: 'LOGIN_ADMIN',
      details: 'Administrator logged into institutional oversight portal.',
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Administrator authentication successful.',
      token,
      redirectUrl: '/admin/dashboard',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        title: user.title,
        avatar: user.avatar,
      },
    });
  } catch (err) {
    console.error('loginAdmin error:', err);
    return res.status(500).json({ success: false, message: 'Authentication error: ' + (err.message || 'Database error') });
  }
};


// LOGOUT
exports.logout = async (req, res) => {
  try {
    if (req.user) {
      await AuditTrail.create({
        user: req.user._id,
        userName: req.user.name,
        role: req.user.role,
        action: 'LOGOUT',
        details: `${req.user.role} logged out.`,
        ipAddress: req.ip || '127.0.0.1',
      });
    }

    res.clearCookie('token');
    return res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    res.clearCookie('token');
    return res.json({ success: true, message: 'Logged out.' });
  }
};

// GET CURRENT AUTHENTICATED USER (verified from MongoDB)
exports.getCurrentUser = async (req, res) => {
  return res.json({
    success: true,
    user: req.user,
  });
};

// UPDATE USER PROFILE (Name, DOB, Bio, Avatar to Cloudinary)
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const { name, bio, dateOfBirth, avatarUrl } = req.body;

    if (name && name.trim()) {
      user.name = name.trim();
    }

    if (bio !== undefined) {
      user.bio = bio;
    }

    if (dateOfBirth) {
      user.dateOfBirth = new Date(dateOfBirth);
    }

    // Direct Avatar URL provided
    if (avatarUrl && avatarUrl.trim()) {
      user.avatar = avatarUrl.trim();
    }

    // Direct File Upload via Multer -> Cloudinary
    if (req.file && req.file.buffer) {
      const uploadOptions = {
        folder: 'projecthub_avatars',
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' }
        ],
      };

      const cloudResult = await uploadBuffer(req.file.buffer, uploadOptions);
      if (cloudResult && cloudResult.secure_url) {
        user.avatar = cloudResult.secure_url;
        user.avatarCloudinaryId = cloudResult.public_id;
      }
    }

    await user.save();

    await AuditTrail.create({
      user: user._id,
      userName: user.name,
      role: user.role,
      action: 'UPDATE_PROFILE',
      details: `${user.name} (${user.role}) updated their profile information and avatar.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        cohort: user.cohort,
        studentId: user.studentId,
        facultyId: user.facultyId,
        title: user.title,
        avatar: user.avatar,
        dateOfBirth: user.dateOfBirth,
        bio: user.bio,
      },
    });
  } catch (err) {
    console.error('updateProfile error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update profile: ' + err.message });
  }
};

// 4. FORGOT PASSWORD (Initiates reset, generates 6-digit verification code or token)
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Academic email address is required.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      // For security, don't reveal non-existent emails, but tell user code was generated if exists
      return res.status(404).json({ success: false, message: 'No registered user found with that email address.' });
    }

    // Generate a secure 6-digit numeric reset OTP/code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordToken = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes validity
    await user.save();

    await AuditTrail.create({
      user: user._id,
      userName: user.name,
      role: user.role,
      action: 'PASSWORD_RESET_REQUESTED',
      details: `Password reset code requested for ${user.email}.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    console.log(`[PASSWORD RESET] Generated OTP Code for ${user.email}: ${resetCode}`);

    return res.json({
      success: true,
      message: 'Password reset code generated successfully. Valid for 15 minutes.',
      resetCode, // Return in response for instant demo convenience
      email: user.email,
    });
  } catch (err) {
    console.error('forgotPassword error:', err);
    return res.status(500).json({ success: false, message: 'Failed to process password reset: ' + err.message });
  }
};

// 5. RESET PASSWORD (Verifies OTP and updates to new password)
exports.resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;
    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({ success: false, message: 'Email, reset code, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters.' });
    }

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      resetPasswordToken: resetCode.trim(),
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired password reset code.' });
    }

    // Hash and store the new password
    user.password = await User.hashPassword(newPassword);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    await AuditTrail.create({
      user: user._id,
      userName: user.name,
      role: user.role,
      action: 'PASSWORD_RESET_SUCCESS',
      details: `Password successfully updated for ${user.email}.`,
      ipAddress: req.ip || '127.0.0.1',
    });

    return res.json({
      success: true,
      message: 'Password updated successfully! You can now log in with your new password.',
    });
  } catch (err) {
    console.error('resetPassword error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password: ' + err.message });
  }
};

