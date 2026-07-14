const Client = require('../../models/Client');
const Log = require('../../models/Log');

function list(req, res) {
  const { search, page } = req.query;
  const result = Client.list({ search, page: Number(page) || 1 });
  res.render('admin/clients/list', { title: 'Clientes', ...result, filters: { search } });
}

function newForm(req, res) {
  res.render('admin/clients/form', { title: 'Novo Cliente', client: null });
}

function create(req, res) {
  const { name, phone, email, birth_date, notes } = req.body;
  const id = Client.create({ name, phone, email: email || null, birth_date: birth_date || null, notes: notes || null });
  Log.record(req.session.user.id, 'client_create', `Cliente #${id} criado.`);
  req.flash('success', 'Cliente cadastrado com sucesso.');
  res.redirect('/admin/clients');
}

function editForm(req, res) {
  const client = Client.find(req.params.id);
  if (!client) {
    req.flash('error', 'Cliente nao encontrado.');
    return res.redirect('/admin/clients');
  }
  res.render('admin/clients/form', { title: 'Editar Cliente', client });
}

function update(req, res) {
  const { name, phone, email, birth_date, notes } = req.body;
  Client.update(req.params.id, { name, phone, email: email || null, birth_date: birth_date || null, notes: notes || null });
  Log.record(req.session.user.id, 'client_update', `Cliente #${req.params.id} atualizado.`);
  req.flash('success', 'Cliente atualizado com sucesso.');
  res.redirect('/admin/clients');
}

function remove(req, res) {
  Client.remove(req.params.id);
  Log.record(req.session.user.id, 'client_delete', `Cliente #${req.params.id} excluido.`);
  req.flash('success', 'Cliente excluido.');
  res.redirect('/admin/clients');
}

function show(req, res) {
  const client = Client.find(req.params.id);
  if (!client) {
    req.flash('error', 'Cliente nao encontrado.');
    return res.redirect('/admin/clients');
  }
  const history = Client.history(req.params.id);
  res.render('admin/clients/show', { title: client.name, client, history });
}

module.exports = { list, newForm, create, editForm, update, remove, show };
