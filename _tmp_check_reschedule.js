const { db } = require('./database/database');
console.log(db.prepare(`
  SELECT a.id, a.status, a.date, a.time, c.name
  FROM appointments a JOIN clients c ON c.id = a.client_id
  WHERE c.name LIKE 'TESTE REMARCAR FULL%'
  ORDER BY a.id
`).all());
