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
https://bachatnix.vercel.app/api/webhooks/cashfree

nimbuspost add the url 
https://bachatnix.vercel.app/api/webhooks/nimbus




<!-- Test Script -->
$body = '{"orderId":"ORD-LGV8KX","event":"SHIPPED"}'
>> Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/nimbus/test" -Method POST -ContentType "application/json" -Body $body



$body = '{"orderId":"ORD-LGV8KX","event":"CONFIRMED"}'
>> Invoke-RestMethod -Uri "http://localhost:3000/api/webhooks/nimbus/test" -Method POST -ContentType "application/json" -Body $body





<!--  Production Delivery Process -->
Real 100% production test ke liye jisme courier boy sach me parcel pick karega aur deliver karega, aapko ye steps follow karne honge:

Step 1: NimbusPost Wallet Me ₹100 – ₹200 Recharge Karein

Kyunki courier company (Delhivery, Shadowfax, etc.) delivery ke charges leti hai, isliye NimbusPost wallet me balance hona compulsory hai (jo "Insufficient balance" error aa raha hai wo isi wajah se hai):

app.nimbuspost.com
 par login karein.
Top right me Recharge Wallet ya Wallet par click karein.
UPI (Google Pay, PhonePe, Paytm) se ₹100 ya ₹200 add karein.
(Recharge hote hi wallet me balance show hone lagega aur insufficient balance error turant solve ho jayega).
Step 2: Pickup Address (Warehouse) Verify Karein

Courier boy parcel lene kahan aayega?

NimbusPost dashboard me Settings → Warehouses / Pickup Addresses par jayein.
Wahan apna pickup address (jahan se parcel pick karwana hai), apna phone number aur PIN code check karein.
Check karein ki wahan jo Warehouse Name / ID hai (e.g. WH-002), wahi aapke .env.local me NIMBUS_WAREHOUSE_ID me likha ho.
Step 3: Test Settings Confirm Karein

Aapke .env.local ya Live Vercel variables me ye set hona chahiye:

env
NIMBUS_SKIP_PICKUP=false
NIMBUS_AUTO_DISPATCH=true

(Isse jaise hi order place hoga, NimbusPost real courier boy ko pickup request bhej dega).

Step 4: Real Test Order Place Karein
Website par jayein aur product cart me add karke Checkout par jayein.
Delivery Address me wo address daalein jahan aapko parcel receive (deliver) karwana hai (apna actual phone number aur valid PIN code daalein taaki delivery boy call kar sake).
Cash on Delivery (COD) ya Online (Cashfree) select karke "Place Order" karein.
Step 5: Label Print Karein Aur Parcel Pack Karein

Order place hone ke baad:

Admin Panel me Orders Page (/admin/orders) kholein.
Wahan us order ke aage 🖨️ Download / Print Label green button aa jayega.
Is label ka printout nikalein (normal A4 paper par nikal kar cut kar sakte hain ya thermal printer se).
Kisi bhi small box ya polybag me product daalkar pack karein aur upar tape se ye Label chipka dein (dhyan rahe barcode par transparent tape ho taaki scan ho sake).
Step 6: Courier Boy Aayega & Delivery Hogi
Pickup Executive:
Next morning ya same day scheduled slot me Delhivery / Nimbus courier boy aapke pickup address par aayega.
Wo apne mobile phone ke handheld scanner se aapke parcel ka barcode scan karega.
Live Tracking:
Barcode scan hote hi aapke Nimbus dashboard aur Bachatnix website par status "In Transit" ho jayega.
Delivery:
1 se 2 din ke andar delivery boy aapke delivery address par aakar parcel deliver karega (agar COD hai toh cash collect karega, agar prepaid hai toh OTP maang kar parcel handover karega).

Pehle Step 1 (NimbusPost wallet recharge ₹100-₹200) complete karein, uske baad order place karke dekhein!