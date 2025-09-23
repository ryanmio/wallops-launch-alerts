-- Create launch_snapshots table for tracking launch notifications
CREATE TABLE IF NOT EXISTS launch_snapshots (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    ll2_id TEXT UNIQUE NOT NULL,
    net TIMESTAMP WITH TIME ZONE NOT NULL,
    window_start TIMESTAMP WITH TIME ZONE,
    window_end TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified_t24 BOOLEAN DEFAULT false,
    notified_t2 BOOLEAN DEFAULT false,
    last_net_emailed TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_launch_snapshots_ll2_id ON launch_snapshots(ll2_id);
CREATE INDEX IF NOT EXISTS idx_launch_snapshots_net ON launch_snapshots(net);
CREATE INDEX IF NOT EXISTS idx_launch_snapshots_status ON launch_snapshots(status);
