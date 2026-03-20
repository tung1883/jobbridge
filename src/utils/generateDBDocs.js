require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs   = require('fs');
const path = require('path');
const pool = require('../config/db');

// shorten verbose postgres type names
const shortType = (type) => {
  const map = {
    'character varying':           'varchar',
    'timestamp without time zone': 'timestamp',
    'timestamp with time zone':    'timestamptz',
    'double precision':            'float8',
    'integer':                     'int',
    'boolean':                     'bool',
    'tsvector':                    'tsvector',
  };
  return map[type] || type;
};

// pad string to fixed width
const pad = (str, len) => String(str).padEnd(len, ' ');

const generateDocs = async () => {
  let doc = `# Database Documentation\n`;
  doc += `> Auto-generated on ${new Date().toISOString()}\n\n`;
  doc += `---\n\n`;

  const tables = await pool.query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  for (const { table_name } of tables.rows) {
    doc += `## ${table_name}\n\n`;

    // columns
    const columns = await pool.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = $1
      ORDER BY ordinal_position
    `, [table_name]);

    const rows = columns.rows.map(col => ({
      name:     col.column_name,
      type:     shortType(col.data_type),
      nullable: col.is_nullable === 'YES' ? 'YES' : 'NO',
      default:  col.column_default || '-',
    }));

    const widths = {
      name:     Math.max(6,  ...rows.map(r => r.name.length)),
      type:     Math.max(4,  ...rows.map(r => r.type.length)),
      nullable: Math.max(8,  ...rows.map(r => r.nullable.length)),
      default:  Math.max(7,  ...rows.map(r => r.default.length)),
    };

    doc += `### Columns\n\n`;
    doc += `| ${pad('Column',   widths.name)} | ${pad('Type',     widths.type)} | ${pad('Nullable', widths.nullable)} | ${pad('Default', widths.default)} |\n`;
    doc += `| ${'-'.repeat(widths.name)} | ${'-'.repeat(widths.type)} | ${'-'.repeat(widths.nullable)} | ${'-'.repeat(widths.default)} |\n`;

    for (const row of rows) {
      doc += `| ${pad(row.name, widths.name)} | ${pad(row.type, widths.type)} | ${pad(row.nullable, widths.nullable)} | ${pad(row.default, widths.default)} |\n`;
    }

    doc += `\n`;

    // primary keys
    const pks = await pool.query(`
      SELECT kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1
      AND tc.constraint_type = 'PRIMARY KEY'
    `, [table_name]);

    if (pks.rows.length > 0) {
      doc += `### Primary Key\n`;
      doc += pks.rows.map(r => `- \`${r.column_name}\``).join('\n');
      doc += `\n\n`;
    }

    // foreign keys
    const fks = await pool.query(`
      SELECT
        kcu.column_name,
        ccu.table_name  AS foreign_table,
        ccu.column_name AS foreign_column,
        rc.delete_rule
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
      WHERE tc.table_name = $1
      AND tc.constraint_type = 'FOREIGN KEY'
    `, [table_name]);

    if (fks.rows.length > 0) {
      const fkWidths = {
        col:     Math.max(6,  ...fks.rows.map(r => r.column_name.length)),
        ref:     Math.max(10, ...fks.rows.map(r => `${r.foreign_table}(${r.foreign_column})`.length)),
        del:     Math.max(9,  ...fks.rows.map(r => r.delete_rule.length)),
      };

      doc += `### Foreign Keys\n\n`;
      doc += `| ${pad('Column', fkWidths.col)} | ${pad('References', fkWidths.ref)} | ${pad('On Delete', fkWidths.del)} |\n`;
      doc += `| ${'-'.repeat(fkWidths.col)} | ${'-'.repeat(fkWidths.ref)} | ${'-'.repeat(fkWidths.del)} |\n`;
      for (const fk of fks.rows) {
        doc += `| ${pad(fk.column_name, fkWidths.col)} | ${pad(`${fk.foreign_table}(${fk.foreign_column})`, fkWidths.ref)} | ${pad(fk.delete_rule, fkWidths.del)} |\n`;
      }
      doc += `\n`;
    }

    // indexes
    const indexes = await pool.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = $1
      AND schemaname = 'public'
    `, [table_name]);

    if (indexes.rows.length > 0) {
      doc += `### Indexes\n\n`;
      for (const idx of indexes.rows) {
        doc += `- \`${idx.indexname}\`: \`${idx.indexdef}\`\n`;
      }
      doc += `\n`;
    }

    // check constraints
    const checks = await pool.query(`
      SELECT 
        tc.constraint_name,
        cc.check_clause
      FROM information_schema.table_constraints tc
      JOIN information_schema.check_constraints cc
        ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = $1
      AND tc.constraint_type = 'CHECK'
    `, [table_name]);

    if (checks.rows.length > 0) {
      doc += `### Constraints\n\n`;
      for (const chk of checks.rows) {
        doc += `- \`${chk.constraint_name}\`: \`${chk.check_clause}\`\n`;
      }
      doc += `\n`;
    }

    // triggers
    const triggers = await pool.query(`
      SELECT trigger_name, event_manipulation, action_timing
      FROM information_schema.triggers
      WHERE event_object_table = $1
    `, [table_name]);

    if (triggers.rows.length > 0) {
      const trgWidths = {
        name:   Math.max(7,  ...triggers.rows.map(r => r.trigger_name.length)),
        event:  Math.max(5,  ...triggers.rows.map(r => r.event_manipulation.length)),
        timing: Math.max(6,  ...triggers.rows.map(r => r.action_timing.length)),
      };

      doc += `### Triggers\n\n`;
      doc += `| ${pad('Trigger', trgWidths.name)} | ${pad('Event', trgWidths.event)} | ${pad('Timing', trgWidths.timing)} |\n`;
      doc += `| ${'-'.repeat(trgWidths.name)} | ${'-'.repeat(trgWidths.event)} | ${'-'.repeat(trgWidths.timing)} |\n`;
      for (const trg of triggers.rows) {
        doc += `| ${pad(trg.trigger_name, trgWidths.name)} | ${pad(trg.event_manipulation, trgWidths.event)} | ${pad(trg.action_timing, trgWidths.timing)} |\n`;
      }
      doc += `\n`;
    }

    doc += `---\n\n`;
  }

  fs.mkdirSync(path.join(__dirname, '../docs'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, '../docs/database.md'), doc);
  console.log('docs/database.md generated');
  process.exit(0);
};

generateDocs();