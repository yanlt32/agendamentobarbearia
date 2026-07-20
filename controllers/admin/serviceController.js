const Service = require('../../models/Service');
const Log = require('../../models/Log');

function list(req, res) {
  res.render('admin/services/list', { title: 'Servicos', services: Service.all() });
}

function newForm(req, res) {
  res.render('admin/services/form', { title: 'Novo Servico', service: null });
}

function create(req, res) {
  const { name, description, price, duration_minutes, category, active } = req.body;
  const id = Service.create({
    name, description: description || null, price: parseFloat(price) || 0,
    duration_minutes: parseInt(duration_minutes, 10) || 30, category: category || null,
    active: active ? 1 : 0,
  });
  Log.record(req.session.user.id, 'service_create', `Servico #${id} criado.`);
  req.flash('success', 'Servico cadastrado com sucesso.');
  res.redirect('/admin/services');
}

function editForm(req, res) {
  const service = Service.find(req.params.id);
  if (!service) {
    req.flash('error', 'Servico nao encontrado.');
    return res.redirect('/admin/services');
  }
  res.render('admin/services/form', { title: 'Editar Servico', service });
}

function update(req, res) {
  const { name, description, price, duration_minutes, category, active } = req.body;
  Service.update(req.params.id, {
    name, description: description || null, price: parseFloat(price) || 0,
    duration_minutes: parseInt(duration_minutes, 10) || 30, category: category || null,
    active: active ? 1 : 0,
  });
  Log.record(req.session.user.id, 'service_update', `Servico #${req.params.id} atualizado.`);
  req.flash('success', 'Servico atualizado com sucesso.');
  res.redirect('/admin/services');
}

function remove(req, res) {
  Service.remove(req.params.id);
  Log.record(req.session.user.id, 'service_delete', `Servico #${req.params.id} excluido.`);
  req.flash('success', 'Servico excluido.');
  res.redirect('/admin/services');
}

// Quick inline price edit, used by the "editar preco" control on the services list
// so the barber can update a value without opening the full edit form.
function updatePrice(req, res) {
  const price = parseFloat(req.body.price);
  const isJson = req.is('json') || req.xhr;

  if (!Service.find(req.params.id)) {
    if (isJson) return res.status(404).json({ error: 'Servico nao encontrado.' });
    req.flash('error', 'Servico nao encontrado.');
    return res.redirect('/admin/services');
  }
  if (Number.isNaN(price) || price < 0) {
    if (isJson) return res.status(400).json({ error: 'Preco invalido.' });
    req.flash('error', 'Preco invalido.');
    return res.redirect('/admin/services');
  }

  Service.updatePrice(req.params.id, price);
  Log.record(req.session.user.id, 'service_price_update', `Preco do servico #${req.params.id} atualizado para R$ ${price.toFixed(2)}.`);

  if (isJson) return res.json({ ok: true, price });
  req.flash('success', 'Preco atualizado.');
  res.redirect('/admin/services');
}

module.exports = { list, newForm, create, editForm, update, remove, updatePrice };
