module.exports = (req, res, next) => {
  const isDemo = process.env.DEMO_MODE === 'true';
  res.locals.demoMode = isDemo;
  req.isDemo = isDemo;
  next();
};

