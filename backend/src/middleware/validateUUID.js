const validateUUID = (req, res, next) => {
  const id = req.params.id;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(id)) {
    return res.status(404).json({ error: 'Not found' });
  }
  next();
};

module.exports = validateUUID;