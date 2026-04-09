import type { Migration } from '../run-migrations'

export const up: Migration = async (client) => {
  await client.query(`
    -- Add approval_status to colors table
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='colors' AND column_name='approval_status') THEN
        ALTER TABLE colors ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved';
      END IF;
    END $$;

    -- Update existing colors to approved
    UPDATE colors SET approval_status = 'approved' WHERE approval_status IS NULL;

    -- Add requested_by to track who asked for the color
    DO $$ 
    BEGIN 
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='colors' AND column_name='requested_by') THEN
        ALTER TABLE colors ADD COLUMN requested_by INTEGER REFERENCES users(id);
      END IF;
    END $$;
  `)
}

export const down: Migration = async (client) => {
  await client.query(`
    ALTER TABLE colors DROP COLUMN IF EXISTS approval_status;
    ALTER TABLE colors DROP COLUMN IF EXISTS requested_by;
  `)
}
