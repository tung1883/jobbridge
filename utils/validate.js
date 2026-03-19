const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  if (error) {
    const messages = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, errors: messages });
  }
  next();
};

const passwordValidator = Joi.string()
    .min(8)
    .pattern(/[A-Z]/, 'uppercase letter')
    .pattern(/[a-z]/, 'lowercase letter')
    .pattern(/[0-9]/, 'number')
    .pattern(/[!@#$%^&*()_+\-=]/, 'special character')
    .required()
    .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.pattern.name': 'Password must contain at least one {#name}',
        'any.required': 'Password is required',
    }
);

const schemas = {
  register: Joi.object({
    // name:     Joi.string().min(2).max(50).required(), // update name in the future
    email:    Joi.string().email().required(),
    password: passwordValidator,
  }),

  login: Joi.object({
    email:    Joi.string().email().required(),
    password: passwordValidator,
  }),
};

module.exports = { validate, schemas };