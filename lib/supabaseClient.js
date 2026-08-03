import { createClient } from "@supabase/supabase-js";

// Deze twee waarden zijn bewust "publiek": ze zijn veilig om in de browser te
// gebruiken. De echte beveiliging zit niet in het geheimhouden van deze sleutel,
// maar in Row Level Security in de database zelf (zie DECISIONS.md).
const supabaseUrl = "https://sihrtkwpimshmgzokvnl.supabase.co";
const supabaseKey = "sb_publishable_Ybt7AUgyzXeI-NjgXD10rw_jyMtuvNE";

export const supabase = createClient(supabaseUrl, supabaseKey);
