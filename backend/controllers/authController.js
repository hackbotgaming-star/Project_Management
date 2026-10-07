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
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
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
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
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
    return res.status(500).json({ success: false, message: 'Internal server error during authentication.' });
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

