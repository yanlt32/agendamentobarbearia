const Setting = require('../../models/Setting');
const Log = require('../../models/Log');

function index(req, res) {
  res.render('admin/settings/index', { title: 'Configuracoes', settings: Setting.getAll() });
}

function update(req, res) {
  const {
    shop_name, phone, whatsapp, instagram, facebook, address, maps_embed, about_text, theme,
  } = req.body;

  const data = { shop_name, phone, whatsapp, instagram, facebook, address, maps_embed, about_text, theme };
  if (req.file) data.logo = `/uploads/settings/${req.file.filename}`;

  Setting.setMany(data);
  Log.record(req.session.user.id, 'settings_update', 'Configuracoes da barbearia atualizadas.');
  req.flash('success', 'Configuracoes salvas com sucesso.');
  res.redirect('/admin/settings');
}

module.exports = { index, update };
