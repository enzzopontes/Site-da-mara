/**
 * Módulo de Segurança de Identidade, Autenticação e Controle de Acesso (Fase 1)
 */

export function validatePassword(password) {
  if (typeof password !== 'string') {
    return { isValid: false, error: 'Senha inválida' }
  }

  if (password.length < 8) {
    return { isValid: false, error: 'A senha deve ter no mínimo 8 caracteres' }
  }

  if (password.length > 128) {
    return { isValid: false, error: 'A senha não pode ultrapassar 128 caracteres' }
  }

  const hasLetter = /[a-zA-Z]/.test(password)
  const hasDigit = /[0-9]/.test(password)

  if (!hasLetter || !hasDigit) {
    return { isValid: false, error: 'A senha deve conter pelo menos uma letra e um número' }
  }

  return { isValid: true }
}

export function sanitizeAuthErrorMessage(rawMessage) {
  if (!rawMessage || typeof rawMessage !== 'string') {
    return 'Ocorreu um erro no processamento. Tente novamente.'
  }

  const msg = rawMessage.toLowerCase()

  // Credenciais inválidas
  if (msg.includes('invalid login credentials') || msg.includes('invalid grant')) {
    return 'E-mail ou senha incorretos.'
  }

  // Prevenção de enumeração de usuário: respostas genéricas para existência de conta
  if (
    msg.includes('user already registered') ||
    msg.includes('user not found') ||
    msg.includes('email already in use') ||
    msg.includes('already exists')
  ) {
    return 'Não foi possível concluir a operação com os dados informados. Verifique e tente novamente.'
  }

  if (msg.includes('password') && (msg.includes('weak') || msg.includes('short') || msg.includes('least'))) {
    return 'A senha fornecida não cumpre os requisitos mínimos de segurança.'
  }

  if (msg.includes('email not confirmed')) {
    return 'Por favor, confirme seu e-mail antes de entrar.'
  }

  return 'Ocorreu um erro. Tente novamente em alguns instantes.'
}

export function isSecureAdminCheck(user, allowedEmailsCsv) {
  if (!user || typeof user !== 'object') return false

  // 1. Role explicitamente configurada em app_metadata (gerenciado por service_role)
  if (user.app_metadata?.role === 'admin') {
    return true
  }

  // 2. Verificação de lista segura de e-mails de admin
  if (user.email && allowedEmailsCsv) {
    // E-mail DEVE estar confirmado para prevenir account takeover por e-mail não verificado
    const isEmailConfirmed = Boolean(user.email_confirmed_at || user.confirmed_at)
    if (!isEmailConfirmed) {
      return false
    }

    const email = String(user.email).trim().toLowerCase()
    const allowedList = allowedEmailsCsv
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)

    if (allowedList.includes(email)) {
      return true
    }
  }

  return false
}
