import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkAssets() {
    const { data, error } = await supabase.from('assets').select('*');
    if (error) {
        console.error('Error fetching assets:', error);
    } else {
        console.log(JSON.stringify(data, null, 2));
    }
}

checkAssets();
