/**
 * Valida um nome de usuário
 * @param {string} username - Nome de usuário a ser validado
 * @returns {Object} {valid: boolean, message: string}
 */
export const validateUsername = (username) => {
  if (!username) {
    return { valid: false, message: 'Nome de usuário é obrigatório' };
  }

  if (username.length < 3) {
    return { valid: false, message: 'Mínimo 3 caracteres' };
  }

  if (username.length > 20) {
    return { valid: false, message: 'Máximo 20 caracteres' };
  }

  const regex = /^[a-zA-Z0-9_]+$/;
  if (!regex.test(username)) {
    return { valid: false, message: 'Use apenas letras, números e _' };
  }

  const reservedNames = ['admin', 'root', 'system', 'moderator', 'suporte'];
  if (reservedNames.includes(username.toLowerCase())) {
    return { valid: false, message: 'Nome de usuário não permitido' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida um endereço de email
 * @param {string} email - Email a ser validado
 * @returns {Object} {valid: boolean, message: string}
 */
export const validateEmail = (email) => {
  if (!email) {
    return { valid: false, message: 'Email é obrigatório' };
  }

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!regex.test(email)) {
    return { valid: false, message: 'Email inválido' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida uma senha
 * @param {string} password - Senha a ser validada
 * @returns {Object} {valid: boolean, message: string}
 */
export const validatePassword = (password) => {
  if (!password) {
    return { valid: false, message: 'Senha é obrigatória' };
  }

  if (password.length < 6) {
    return { valid: false, message: 'Mínimo 6 caracteres' };
  }

  if (password.length > 50) {
    return { valid: false, message: 'Máximo 50 caracteres' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida a idade (checkbox de confirmação)
 * @param {boolean} isOver13 - Se o usuário confirmou ter mais de 13 anos
 * @returns {Object} {valid: boolean, message: string}
 */
export const validateAge = (isOver13) => {
  if (!isOver13) {
    return { valid: false, message: 'Você deve ter mais de 13 anos para se registrar' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida a seleção de província
 * @param {string} province - Código da província
 * @returns {Object} {valid: boolean, message: string}
 */
export const validateProvince = (province) => {
  if (!province) {
    return { valid: false, message: 'Selecione sua província' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida a seleção de cidade
 * @param {string} city - Nome da cidade
 * @returns {Object} {valid: boolean, message: string}
 */
export const validateCity = (city) => {
  if (!city) {
    return { valid: false, message: 'Selecione sua cidade' };
  }

  return { valid: true, message: '' };
};

/**
 * Valida todos os campos do perfil de uma vez
 * @param {Object} userData - Dados do usuário
 * @returns {Object} {isValid: boolean, errors: Object}
 */
export const validateProfile = (userData) => {
  const usernameValidation = validateUsername(userData.username);
  const ageValidation = validateAge(userData.isOver13);
  const provinceValidation = validateProvince(userData.province);
  const cityValidation = validateCity(userData.city);

  const errors = {
    username: usernameValidation.message,
    isOver13: ageValidation.message,
    province: provinceValidation.message,
    city: cityValidation.message
  };

  const isValid = usernameValidation.valid && 
                 ageValidation.valid && 
                 provinceValidation.valid && 
                 cityValidation.valid;

  return { isValid, errors };
};

/**
 * Valida um código de referência
 * @param {string} refCode - Código de referência
 * @returns {Object} {valid: boolean, message: string}
 */
export const validateReferralCode = (refCode) => {
  if (!refCode) {
    return { valid: true, message: '' }; // Código opcional
  }

  if (refCode.length !== 8) {
    return { valid: false, message: 'Código inválido' };
  }

  const regex = /^[A-Z0-9]+$/;
  if (!regex.test(refCode)) {
    return { valid: false, message: 'Código contém caracteres inválidos' };
  }

  return { valid: true, message: '' };
};