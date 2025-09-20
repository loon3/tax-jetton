import "@stdlib/ownable";

contract TaxJetton() {
    // empty receiver for deployment
    receive() {
        cashback(sender());
    }
}
