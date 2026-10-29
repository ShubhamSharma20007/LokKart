1. Customer UPI se Pay Karega (Cashfree)
   ↓
2. Order Database mein save ho jaayega:
   - status: PLACED
   - paymentStatus: PAID
   ↓
3. Aap (Admin) Box pack karke Admin Panel (/admin/orders) par
   "📦 Book Courier" button par click karenge:
   - NimbusPost par Prepaid order register hoga (Collectable: ₹0)
   - Real AWB Number generate hoga
   - Shipping Label generate hoga (print karke box par chipkane ke liye)
   - NimbusPost par Warehouse Pickup schedule ho jaayega (kyunki NIMBUS_SKIP_PICKUP=false hai)
   - Order status: CONFIRMED
   ↓
4. Courier Boy (Delhivery / Shadowfax / Blue Dart)
   Aapke Alwar Warehouse aayega aur box pickup karega 🚚
   ↓
5. NimbusPost Webhooks Automatic Updates Bhejega:
   - Courier ne pick kiya → Order status auto SHIPPED ho jaayega
   - Transit / Out for Delivery → Live updates
   - Customer ko deliver hua → Order status auto DELIVERED ho jaayega ✅





<!--  IN PRODUCTION -->
add the prod url in cashfree
https://yourdomain.com/api/webhooks/cashfree

nimbuspost add the url 
https://yourdomain.com/api/webhooks/nimbus