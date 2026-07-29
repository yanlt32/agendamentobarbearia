const Client = require('../../models/Client');
const Log = require('../../models/Log');

function list(req, res) {
  const { search, blacklisted, page } = req.query;
  const result = Client.list({ search, blacklistedOnly: blacklisted === '1', page: Number(page) || 1 });
  res.render('admin/clients/list', {
    title: blacklisted === '1' ? 'Clientes Bloqueados' : 'Clientes',
    ...result,
    filters: { search, blacklisted },
  });
}

function newForm(req, res) {
  res.render('admin/clients/form', { title: 'Novo Cliente', record: null });
}

function create(req, res) {
  const { name, phone, cpf, email, birth_date, notes } = req.body;
  const id = Client.create({ name, phone, cpf: cpf || null, email: email || null, birth_date: birth_date || null, notes: notes || null });
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
  // NB: the render key must not be named "client" -- EJS reserves that
  // name as a compile option (standalone/browser-mode compilation), and a
  // truthy value silently strips the include() helper from every partial.
  res.render('admin/clients/form', { title: 'Editar Cliente', record: client });
}

function update(req, res) {
  const { name, phone, cpf, email, birth_date, notes } = req.body;
  Client.update(req.params.id, { name, phone, cpf: cpf || null, email: email || null, birth_date: birth_date || null, notes: notes || null });
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
  res.render('admin/clients/show', { title: client.name, record: client, history });
}

function unblacklistClient(req, res) {
  Client.unblacklist(req.params.id);
  Log.record(req.session.user.id, 'client_unblacklist', `Cliente #${req.params.id} liberado para agendar online.`);
  req.flash('success', 'Cliente liberado para agendar online novamente.');
  res.redirect(req.get('referer') || `/admin/clients/${req.params.id}`);
}

module.exports = { list, newForm, create, editForm, update, remove, show, unblacklistClient };
