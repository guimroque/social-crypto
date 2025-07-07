script;

use std::{b512::B512, tx::{GTF_WITNESS_DATA, tx_id, tx_witnesses_count}};

fn main() -> u64 {
    let i_witnesses = 0;
    let mut witness_ptr = __gtf::<raw_ptr>(i_witnesses, GTF_WITNESS_DATA);
    let signature = witness_ptr.read::<B512>();

    log(signature);




    
    return 0;
}
