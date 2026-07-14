function notFound(req, res) {
  res.status(404).render('errors/404', { title: 'Pagina nao encontrada' });
}

function errorHandler(err, req, res, next) { // eslint-disable-line no-unused-vars
  console.error(err);
  res.status(err.status || 500).render('errors/500', {
    title: 'Erro interno',
    message: process.env.NODE_ENV === 'production' ? 'Algo deu errado.' : err.message,
  });
}

module.exports = { notFound, errorHandler };
