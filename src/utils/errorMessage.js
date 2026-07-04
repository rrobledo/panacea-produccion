const MESSAGES_BY_STATUS = {
  400: 'Solicitud inválida.',
  401: 'Sesión expirada. Por favor, inicie sesión nuevamente.',
  403: 'No tiene permisos para realizar esta acción.',
  404: 'El recurso solicitado no fue encontrado.',
  409: 'El registro fue modificado por otro usuario. Recargue e intente nuevamente.',
  422: 'Los datos ingresados no son válidos.',
  500: 'Error interno del servidor. Intente nuevamente más tarde.',
  502: 'El servidor no está disponible. Intente nuevamente más tarde.',
  503: 'El servicio no está disponible. Intente nuevamente más tarde.',
};

export const getErrorMessage = (error) => {
  const status = error?.response?.status;
  const detail = error?.response?.data?.detail || error?.response?.data?.message || error?.response?.data?.error;
  return detail || MESSAGES_BY_STATUS[status] || 'Ocurrió un error inesperado. Intente nuevamente.';
};
