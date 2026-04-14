import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL="https://erydxufihxdyhzklpjza.supabase.co";
const SUPABASE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9... (I'll just fetch without it and use the hardcoded token)";

// Actually since I just want to test mk-api, let's fetch directly:
const BASE_URL = 'http://186.219.120.50:8080';
const TOKEN = '70b67a8db43c7c2805cae12b4d25a511.932601'; // Expired, but I can use an invalid one and get the error, wait, the error is 401...

