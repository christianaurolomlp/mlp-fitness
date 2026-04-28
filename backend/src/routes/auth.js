const router = require('express').Router();
const jwt = require('jsonwebtoken');

router.post('/login', (req, res) => {
  const { password } = req.body;

  if (!password || password !== process.env.AUTH_PASSWORD) {
    return res.status(401).json({ error: 'Contraseña incorrecta' });
  }

  const token = jwt.sign(
    { user: 'capi', iat: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '30d' }
  );

  res.json({ token });
});

module.exports = router;
