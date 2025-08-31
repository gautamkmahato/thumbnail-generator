import { createClient } from "@supabase/supabase-js";


const SUPABASE_URL = "https://fdmvffppytuiuctqijvc.supabase.co"
const SUPABASE_SERVICE_ROLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkbXZmZnBweXR1aXVjdHFpanZjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM2MjQzNjMsImV4cCI6MjA2OTIwMDM2M30.J3rKyzimWVP8-tS7nGg6OFbnnJs4PAnn9CgEq9X3pnU"

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY
);

export default supabase;