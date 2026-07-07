# თამაშის გადახდის API — კონტრაქტი PHP გუნდისთვის (mafia.ge)

> ეს დოკუმენტი აღწერს PHP backend-ზე ასაშენებელ **ბალანსის ჩამოჭრის (charge)** და
> **დაბრუნების (refund)** endpoint-ებს. წყარო (single source of truth) ბალანსზე არის
> MySQL (`accounts`). Convex/Next.js მხოლოდ იძახებს ამ endpoint-ებს server-to-server.
>
> **მთავარი პრინციპი:** ეს endpoint-ები ფულზე მუშაობს. ისინი **არასდროს** უნდა იყოს
> ხელმისაწვდომი ბრაუზერიდან/კლიენტიდან. მხოლოდ სერვერი-სერვერთან, ხელმოწერით (HMAC),
> იდემპოტენტურად და ატომური DB-ტრანზაქციით.

---

## 1. მაღალი დონის ნაკადი (flow)

```
1. ჰოსტი თამაშში აჭერს "Start".
2. Convex წინასწარ ამოწმებს ბალანსს (mirror-ი profiles.amount-ში) — იაფი ადრეული უარყოფა.
   ⚠️ ეს მხოლოდ UX-ისთვისაა, არა ავტორიტეტული.
3. Convex ქმნის "pending" charge-ჩანაწერს უნიკალური batchId-ით და იძახებს PHP-ს:
   POST /api/internal/games/charge
4. PHP ცალკე ერთ DB-ტრანზაქციაში:
   - თითოეულ accountId-ს უკეთებს SELECT ... FOR UPDATE,
   - გადაამოწმებს ბალანსს MySQL-ში (ავტორიტეტული შემოწმება),
   - თუ თუნდაც ერთს არ ჰყოფნის → არაფერს ჭრის, აბრუნებს უარს + ვინ ვერ გადაიხადა,
   - თუ ყველას ჰყოფნის → ყველას ერთად ჭრის და წერს ledger-ში,
   - commit ან rollback (ყველა ან არცერთი).
5. PHP აბრუნებს per-player შედეგებს.
6. Convex:
   - წარმატება → თამაში გადადის "playing" სტატუსში.
   - უარი → თამაში არ იწყება, UI აჩვენებს ვის არ ჰყოფნის ბალანსი.
7. დაბრუნება (refund) — მომავალში ადმინ-პანელიდან, ცალკე endpoint-ით.
```

**კრიტიკული:** თამაში „playing"-ში გადადის **მხოლოდ** charge-ის წარმატების შემდეგ.
ჯერ ფული ჩამოიჭრება, მერე თამაში იწყება.

---

## 2. უსაფრთხოების მოთხოვნები (სავალდებულო)

ეს არ არის რეკომენდაცია — ფულთან მუშაობის გამო ყველა პუნქტი სავალდებულოა.

### 2.1. მხოლოდ server-to-server

- endpoint-ები **არ** უნდა იყოს ხელმისაწვდომი ბრაუზერიდან.
- **არ** დაამატოთ CORS, რომელიც უშვებს browser origin-ებს.
- არ უნდა მუშაობდეს მომხმარებლის სესიით/cookie-ით. მხოლოდ ქვემოთ აღწერილი header-ებით.

### 2.2. ორი დამოუკიდებელი საიდუმლო

| საიდუმლო               | დანიშნულება                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| `INTERNAL_API_KEY`     | იდენტიფიცირებს მომძახებელ სერვისს (იგივე, რაც `/api/auth/user-by-session`-ს აქვს)        |
| `PAYMENTS_HMAC_SECRET` | მოთხოვნის ხელმოწერა (HMAC). **ცალკე, ახალი საიდუმლო.** არ გამოიყენოთ იგივე, რაც API key) |

ორივე გადაეცემა გუნდებს უსაფრთხო არხით (არა git-ში, არა Slack-ში plaintext-ად).

### 2.3. HMAC ხელმოწერა (authenticity + tampering protection)

ყოველი მოთხოვნა შეიცავს მხოლოდ **ორ** header-ს:

| Header               | მნიშვნელობა                             |
| -------------------- | --------------------------------------- |
| `X-Internal-Api-Key` | shared API key                          |
| `X-Signature`        | `sha256=<hex>` — body-ის HMAC ხელმოწერა |

**ხელმოსაწერი მონაცემი = უბრალოდ raw body** (არანაირი timestamp/nonce):

```
signature = "sha256=" + hex( HMAC_SHA256(PAYMENTS_HMAC_SECRET, <raw request body bytes>) )
```

PHP-ის ვალიდაცია:

1. **API key** სწორია → თუ არა: `401`.
2. **ხელმოწერა**: ხელახლა გამოთვალეთ `signature` **raw body-ზე** (არა re-serialized JSON-ზე!) და შეადარეთ **constant-time** ფუნქციით (`hash_equals`) → თუ არ ემთხვევა: `401`.
3. parse → თუ `batchId` უკვე დამუშავებულია, დააბრუნე შენახული შედეგი (`replayed: true`) და **არ** ჩაჭრა თავიდან (იხ. 2.4).

> ⚠️ ხელმოწერა მოწმდება **საწყის (raw) body bytes-ზე**, ვიდრე JSON parse-ს გააკეთებთ.
> არ ხელახლა-დაასერიალოთ. წინააღმდეგ შემთხვევაში ხელმოწერა აღარ დაემთხვევა.

**replay-ისგან დაცვა timestamp/nonce-ის გარეშე:** მთავარ ანტი-replay როლს ასრულებს `batchId`
(იხ. 2.4) — ის უნიკალურია, body-შია (ანუ ხელმოწერა მას იცავს) და PHP-ში ინახება `UNIQUE`-ით
სამუდამოდ. ჩაწერილი მოთხოვნის გამეორებაც კი იგივე `batchId`-ით მოვა და idempotency-ის წყალობით
უბრალოდ შენახულ შედეგს დააბრუნებს — ფული მეორედ **ვერ** ჩამოიჭრება. ამიტომ ცალკე `X-Timestamp`/
`X-Nonce` საჭირო არ არის.

PHP მაგალითი:

```php
$apiKey   = $_SERVER['HTTP_X_INTERNAL_API_KEY'] ?? '';
$provided = $_SERVER['HTTP_X_SIGNATURE'] ?? '';
$rawBody  = file_get_contents('php://input');

// 1. api key
if (!hash_equals(INTERNAL_API_KEY, $apiKey)) { http_response_code(401); exit; }

// 2. signature (raw body-ზე, constant-time)
$expected = 'sha256=' . hash_hmac('sha256', $rawBody, PAYMENTS_HMAC_SECRET);
if (!hash_equals($expected, $provided)) { http_response_code(401); exit; }

// 3. parse + idempotency (= replay-ისგან დაცვაც)
$payload = json_decode($rawBody, true);
if (batch_already_processed($payload['batchId'])) {
    echo stored_result($payload['batchId']); // "replayed": true
    exit;
}
```

### 2.4. იდემპოტენტურობა (ორმაგი ჩამოჭრის + replay-ის თავიდან აცილება)

ქსელური retry-ის, action-ის გამეორების **ან replay-შეტევის** შემთხვევაში PHP **არ უნდა** ჩამოჭრას
ფული ორჯერ. `batchId` ერთდროულად ასრულებს idempotency-ისა და anti-replay token-ის როლს.

- ყოველ charge მოთხოვნას აქვს უნიკალური `batchId`.
- PHP ინახავს `batchId`-ს უნიკალური ინდექსით (`UNIQUE` constraint).
- თუ იგივე `batchId` მოვა მეორედ → **არ** ამუშავებს თავიდან, აბრუნებს **პირველი დამუშავების შენახულ შედეგს** (იგივე HTTP სტატუსით) + ველი `"replayed": true`.
- იგივე ლოგიკა `refundId`-ზე.

### 2.5. ატომური DB-ტრანზაქცია

- ყველა player ერთ ტრანზაქციაში (`START TRANSACTION` … `COMMIT`/`ROLLBACK`).
- თითო account-ზე `SELECT balance ... FOR UPDATE` (row lock) — race condition-ის თავიდან აცილება.
- ბალანსი **არასდროს** არ უნდა გახდეს უარყოფითი (DB-დონის შემოწმება/`CHECK`).

### 2.6. თანხის ვალიდაცია სერვერზე

- ფიქსირებული გლობალური თანხა — **ავტორიტეტული მნიშვნელობა ინახება PHP-ში** (config).
- მოთხოვნაში მოსული `amount` PHP-მ უნდა შეადაროს თავის config-ს. **არ ემთხვევა → `422`** (tampering-ის სიგნალი). კლიენტიდან მოსულ თანხას ვერ ვენდობით.

### 2.7. თანხის ფორმატი

- თანხა გადაეცემა **მთელ რიცხვად, მინიმალურ ერთეულებში (თეთრი)**. მაგ.: `500` = 5.00 ₾.
- `float`-ით ფულის შენახვა/გადაცემა **აკრძალულია** (მრგვალების შეცდომები).

### 2.8. დანარჩენი

- **HTTPS/TLS** მხოლოდ.
- **Rate limiting** ამ endpoint-ებზე.
- **Audit log** ყველა მცდელობაზე (წარმატება და უარი).
- **(არჩევითი, defense-in-depth):** თუ Convex-ის ნაცვლად ზარი მოვა ჩვენი Next.js სერვერიდან რომელსაც სტატიკური გამავალი IP აქვს — PHP-ს შეუძლია **IP allowlist**-იც დაამატოს. ეს ცალკე გადასაწყვეტია infra-ს მიხედვით; HMAC ისედაც სავალდებულოა.

---

## 3. Endpoint #1 — ჩამოჭრა (Charge)

```
POST /api/internal/games/charge
Content-Type: application/json
```

### Request body

```json
{
  "batchId": "b3f1c2a4-...-uuid",
  "gameId": "j57d8...convexId",
  "gameCode": "ABCD",
  "amount": 500,
  "currency": "GEL",
  "accountIds": [12, 34, 56, 78],
  "reason": "game_start",
  "createdAt": 1718800000
}
```

| ველი         | ტიპი          | აღწერა                                                     |
| ------------ | ------------- | ---------------------------------------------------------- |
| `batchId`    | string (UUID) | იდემპოტენტურობის გასაღები. უნიკალური თითო start-მცდელობაზე |
| `gameId`     | string        | Convex-ის თამაშის ID (audit/ledger-ისთვის)                 |
| `gameCode`   | string        | თამაშის კოდი (ადამიანისთვის წასაკითხი reference)           |
| `amount`     | integer       | თეთრებში. PHP ამოწმებს თავის config-თან                    |
| `currency`   | string        | ამჟამად ყოველთვის `"GEL"`                                  |
| `accountIds` | integer[]     | ჩამოსაჭრელი `accounts.id`-ების სია                         |
| `reason`     | string        | `"game_start"`                                             |
| `createdAt`  | integer       | UNIX წამები                                                |

### Response — წარმატება `200`

ყველა მოთამაშეს ჩამოეჭრა.

```json
{
  "batchId": "b3f1c2a4-...",
  "status": "charged",
  "results": [
    {
      "accountId": 12,
      "status": "charged",
      "transactionId": "txn_001",
      "balanceAfter": 4500
    },
    {
      "accountId": 34,
      "status": "charged",
      "transactionId": "txn_002",
      "balanceAfter": 1200
    }
  ],
  "replayed": false
}
```

### Response — უარი (არ ჰყოფნის) `422`

**არაფერი არ ჩამოჭრილა** (all-or-nothing). მითითებულია ვის არ ჰყოფნა ბალანსი.

```json
{
  "batchId": "b3f1c2a4-...",
  "status": "rejected",
  "reason": "insufficient_funds",
  "results": [
    { "accountId": 12, "status": "ok" },
    {
      "accountId": 34,
      "status": "insufficient_funds",
      "balance": 200,
      "required": 500
    }
  ]
}
```

### სხვა შეცდომები

| HTTP  | `reason`                  | მნიშვნელობა                                      |
| ----- | ------------------------- | ------------------------------------------------ |
| `401` | —                         | არასწორი api key / ხელმოწერა / timestamp / nonce |
| `422` | `amount_mismatch`         | მოსული `amount` ≠ PHP config                     |
| `422` | `unknown_account`         | რომელიმე `accountId` არ არსებობს                 |
| `422` | `insufficient_funds`      | იხ. ზემოთ                                        |
| `409` | `batch_already_processed` | (არასავალდებულო — ჯობს `200`+`replayed:true`)    |
| `500` | `internal`                | სერვერის შეცდომა (Convex retry-ს გააკეთებს)      |

> შენიშვნა: იდემპოტენტური replay-ისას აბრუნებთ **იგივე** body-ს, რაც პირველად, ოღონდ `"replayed": true`.

---

## 4. Endpoint #2 — დაბრუნება (Refund)

> **სტატუსი:** endpoint ააშენეთ ახლავე, მაგრამ trigger მომავალში მოვა — ადმინ-პანელიდან
> ადმინი გადაწყვეტს დაბრუნებას. ამიტომ მოთხოვნა შეიცავს `adminAccountId`-ს audit-ისთვის.

```
POST /api/internal/games/refund
Content-Type: application/json
```

### Request body

```json
{
  "refundId": "r9a8...uuid",
  "batchId": "b3f1c2a4-...",
  "gameId": "j57d8...convexId",
  "accountIds": null,
  "amount": null,
  "reason": "game_cancelled_by_admin",
  "adminAccountId": 1,
  "createdAt": 1718801000
}
```

| ველი             | ტიპი              | აღწერა                                                                 |
| ---------------- | ----------------- | ---------------------------------------------------------------------- |
| `refundId`       | string (UUID)     | იდემპოტენტურობის გასაღები                                              |
| `batchId`        | string            | თავდაპირველი charge batch, რომელსაც უბრუნდება                          |
| `accountIds`     | integer[] \| null | `null` = batch-ის ყველა მოთამაშე. სია = მხოლოდ ეს მოთამაშეები          |
| `amount`         | integer \| null   | `null` = თავდაპირველად ჩამოჭრილი თანხა. სხვა შემთხვევაში — ნაწილობრივი |
| `reason`         | string            | ტექსტური მიზეზი                                                        |
| `adminAccountId` | integer           | რომელმა ადმინმა გასცა (audit)                                          |

### PHP წესები

- დააბრუნე მხოლოდ ის თანხა, რომელიც **რეალურად ჩამოიჭრა** ამ `batchId`-ით (ledger-ის მიხედვით).
- **ორმაგი დაბრუნება აკრძ.**: ერთი charge-transaction ერთხელ ბრუნდება. თუ უკვე refunded-ია → უარი/`replayed`.
- იდემპოტენტური `refundId`-ით.
- ატომური ტრანზაქცია + ledger-ში refund-ჩანაწერები.

### Response `200`

```json
{
  "refundId": "r9a8...",
  "status": "refunded",
  "results": [
    {
      "accountId": 12,
      "status": "refunded",
      "transactionId": "txn_101",
      "amount": 500,
      "balanceAfter": 5000
    }
  ],
  "replayed": false
}
```

| HTTP  | `reason`                 |
| ----- | ------------------------ |
| `404` | `batch_not_found`        |
| `409` | `already_refunded`       |
| `422` | `amount_exceeds_charged` |

---

## 5. Ledger ცხრილი (PHP-ის მხარეს, რეკომენდაცია)

ფულის ყოველი მოძრაობა ცალკე ჩანაწერად — reconciliation-ისა და audit-ისთვის.

```sql
CREATE TABLE game_balance_ledger (
  id              BIGINT PRIMARY KEY AUTO_INCREMENT,
  transaction_id  VARCHAR(64) NOT NULL,        -- დაბრუნებული txn id
  batch_id        VARCHAR(64) NOT NULL,        -- charge batch
  refund_id       VARCHAR(64) NULL,            -- მხოლოდ refund-ზე
  account_id      BIGINT NOT NULL,
  game_id         VARCHAR(64) NOT NULL,
  type            ENUM('charge','refund') NOT NULL,
  amount          INT NOT NULL,                -- თეთრი (დადებითი)
  balance_before  INT NOT NULL,
  balance_after   INT NOT NULL,
  status          ENUM('charged','refunded') NOT NULL,
  created_at      DATETIME NOT NULL,
  UNIQUE KEY uq_batch_account (batch_id, account_id, type),
  KEY idx_game (game_id),
  KEY idx_account (account_id)
);
```

`UNIQUE (batch_id, account_id, type)` თავად ამაგრებს იდემპოტენტურობას DB-დონეზე.

---

## 6. შესამოწმებელი სცენარები (acceptance)

- [ ] სწორი მოთხოვნა → ყველა ერთად იჭრება, ledger ივსება, ბალანსი მცირდება.
- [ ] ერთს არ ჰყოფნის → **არცერთს არ ეჭრება**, `422 insufficient_funds`, სია სწორია.
- [ ] იგივე `batchId` მეორედ → ფული **არ** იჭრება ორჯერ, აბრუნებს იგივე შედეგს (`replayed:true`).
- [ ] არასწორი ან არარსებული `X-Signature` → `401`.
- [ ] ჩაწერილი ვალიდური მოთხოვნის replay იგივე `batchId`-ით → ფული **არ** იჭრება, ბრუნდება `replayed:true`.
- [ ] `amount` ≠ config → `422 amount_mismatch`.
- [ ] paralleled მოთხოვნები ერთსა და იმავე account-ზე → `FOR UPDATE` კეტავს, ბალანსი არ გაფუჭდება.
- [ ] refund → მხოლოდ ჩამოჭრილი თანხა ბრუნდება, ორჯერ არ ბრუნდება.
- [ ] Postman-იდან api key-ით მაგრამ ხელმოწერის გარეშე → `401`.

---

## 7. გასაცვლელი საიდუმლოები / კონფიგი

| მხარე  | ცვლადი                                                                                     |
| ------ | ------------------------------------------------------------------------------------------ |
| PHP    | `INTERNAL_API_KEY` (არსებული), `PAYMENTS_HMAC_SECRET` (ახალი), `GAME_BUYIN_AMOUNT` (თეთრი) |
| Convex | იგივე `INTERNAL_API_KEY`, `PAYMENTS_HMAC_SECRET`, PHP base URL                             |

---

_ვერსია 1 — შესათანხმებლად PHP გუნდთან. კითხვები/შენიშვნები მოგვწერეთ შეთანხმებამდე._
