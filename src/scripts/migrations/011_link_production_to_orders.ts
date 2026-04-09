import type { Migration } from '../run-migrations'

export const up: Migration = async (client) => {
  await client.query(`
    -- Add order_id and client_name to production_runs to track which client ordered this batch
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_runs' AND column_name='order_id') THEN
        ALTER TABLE production_runs ADD COLUMN order_id INTEGER REFERENCES client_orders(id);
      END IF;
    END $$;

    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_runs' AND column_name='client_name') THEN
        ALTER TABLE production_runs ADD COLUMN client_name VARCHAR(255);
      END IF;
    END $$;

    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='production_runs' AND column_name='order_date') THEN
        ALTER TABLE production_runs ADD COLUMN order_date TIMESTAMP WITH TIME ZONE;
      END IF;
    END $$;
  `)
}

export const down: Migration = async (client) => {
  await client.query(`
    ALTER TABLE production_runs DROP COLUMN IF EXISTS order_id;
    ALTER TABLE production_runs DROP COLUMN IF EXISTS client_name;
    ALTER TABLE production_runs DROP COLUMN IF EXISTS order_date;
  `)
}
