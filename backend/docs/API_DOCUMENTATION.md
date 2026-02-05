# API 문서

## Base URL
```
http://localhost:3000
```

## Swagger API 문서
대화형 API 문서는 다음 주소에서 확인할 수 있습니다:
```
http://localhost:3000/api
```

Swagger UI에서 직접 API를 테스트하고 요청/응답 형식을 확인할 수 있습니다.

---

## Users API

### 1. 사용자 생성
새로운 사용자를 생성합니다.

**Endpoint**
```
POST /users
```

**Request Body**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"  // 선택 사항
}
```

**Validation Rules**
- `email`: 필수, 이메일 형식, 중복 불가
- `password`: 필수, 최소 6자
- `name`: 선택

**Success Response (201 Created)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Responses**

400 Bad Request - 유효성 검증 실패
```json
{
  "statusCode": 400,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 6 characters"
  ],
  "error": "Bad Request"
}
```

409 Conflict - 이메일 중복
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

**cURL Example**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "name": "John Doe"
  }'
```

---

### 2. 모든 사용자 조회
등록된 모든 사용자 목록을 조회합니다.

**Endpoint**
```
GET /users
```

**Success Response (200 OK)**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "user1@example.com",
    "name": "John Doe",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "email": "user2@example.com",
    "name": "Jane Smith",
    "createdAt": "2024-01-02T00:00:00.000Z",
    "updatedAt": "2024-01-02T00:00:00.000Z"
  }
]
```

**cURL Example**
```bash
curl -X GET http://localhost:3000/users
```

---

### 3. 특정 사용자 조회
ID로 특정 사용자의 정보를 조회합니다.

**Endpoint**
```
GET /users/:id
```

**URL Parameters**
- `id` (string, required): 사용자 UUID

**Success Response (200 OK)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response**

404 Not Found - 사용자를 찾을 수 없음
```json
{
  "statusCode": 404,
  "message": "User with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

**cURL Example**
```bash
curl -X GET http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000
```

---

### 4. 사용자 정보 수정
특정 사용자의 정보를 수정합니다.

**Endpoint**
```
PATCH /users/:id
```

**URL Parameters**
- `id` (string, required): 사용자 UUID

**Request Body** (모든 필드 선택 사항)
```json
{
  "email": "newemail@example.com",
  "password": "newpassword123",
  "name": "New Name"
}
```

**Validation Rules**
- `email`: 선택, 이메일 형식, 중복 불가
- `password`: 선택, 최소 6자
- `name`: 선택

**Success Response (200 OK)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "newemail@example.com",
  "name": "New Name",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-02T00:00:00.000Z"
}
```

**Error Responses**

404 Not Found - 사용자를 찾을 수 없음
```json
{
  "statusCode": 404,
  "message": "User with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

409 Conflict - 이메일 중복
```json
{
  "statusCode": 409,
  "message": "Email already exists",
  "error": "Conflict"
}
```

**cURL Example**
```bash
curl -X PATCH http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Name"
  }'
```

---

### 5. 사용자 삭제
특정 사용자를 삭제합니다.

**Endpoint**
```
DELETE /users/:id
```

**URL Parameters**
- `id` (string, required): 사용자 UUID

**Success Response (200 OK)**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "user@example.com",
  "name": "John Doe",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Error Response**

404 Not Found - 사용자를 찾을 수 없음
```json
{
  "statusCode": 404,
  "message": "User with ID 550e8400-e29b-41d4-a716-446655440000 not found",
  "error": "Not Found"
}
```

**cURL Example**
```bash
curl -X DELETE http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000
```

---

## 공통 응답 형식

### 성공 응답
- 상태 코드: 200 (OK), 201 (Created)
- 본문: JSON 형식의 데이터

### 에러 응답
모든 에러는 다음 형식을 따릅니다:

```json
{
  "statusCode": 400,
  "message": "에러 메시지 또는 배열",
  "error": "에러 타입"
}
```

**HTTP 상태 코드**
- `200 OK`: 요청 성공
- `201 Created`: 리소스 생성 성공
- `400 Bad Request`: 잘못된 요청 (유효성 검증 실패)
- `404 Not Found`: 리소스를 찾을 수 없음
- `409 Conflict`: 리소스 충돌 (중복 등)
- `500 Internal Server Error`: 서버 내부 오류

---

## 보안 고려사항

### 비밀번호 처리
- 비밀번호는 bcrypt로 해싱되어 저장됨 (salt rounds: 10)
- 응답에서 비밀번호는 절대 포함되지 않음
- 최소 6자 이상 요구

### 이메일 중복 체크
- 생성 시: 이메일 중복 확인
- 수정 시: 다른 사용자의 이메일과 중복 확인

---

## 테스트 시나리오

### 1. 사용자 생성 → 조회
```bash
# 1. 사용자 생성
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123","name":"Test User"}'

# 응답에서 id 복사 (예: 550e8400-e29b-41d4-a716-446655440000)

# 2. 생성된 사용자 조회
curl -X GET http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000
```

### 2. 사용자 수정
```bash
# 사용자 이름 수정
curl -X PATCH http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000 \
  -H "Content-Type: application/json" \
  -d '{"name":"Updated Name"}'
```

### 3. 사용자 삭제
```bash
# 사용자 삭제
curl -X DELETE http://localhost:3000/users/550e8400-e29b-41d4-a716-446655440000
```

### 4. 에러 케이스 테스트

**잘못된 이메일 형식**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"invalid-email","password":"test123"}'
# 400 Bad Request
```

**짧은 비밀번호**
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"123"}'
# 400 Bad Request
```

**이메일 중복**
```bash
# 같은 이메일로 두 번 생성 시도
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}'
# 409 Conflict
```

**존재하지 않는 사용자 조회**
```bash
curl -X GET http://localhost:3000/users/00000000-0000-0000-0000-000000000000
# 404 Not Found
```

---

## Postman Collection

### 환경 변수 설정
```json
{
  "baseUrl": "http://localhost:3000",
  "userId": ""
}
```

### 요청 예시

**1. Create User**
- Method: POST
- URL: `{{baseUrl}}/users`
- Body (raw JSON):
```json
{
  "email": "test@example.com",
  "password": "test123",
  "name": "Test User"
}
```
- Tests (응답에서 userId 저장):
```javascript
pm.environment.set("userId", pm.response.json().id);
```

**2. Get All Users**
- Method: GET
- URL: `{{baseUrl}}/users`

**3. Get User by ID**
- Method: GET
- URL: `{{baseUrl}}/users/{{userId}}`

**4. Update User**
- Method: PATCH
- URL: `{{baseUrl}}/users/{{userId}}`
- Body (raw JSON):
```json
{
  "name": "Updated Name"
}
```

**5. Delete User**
- Method: DELETE
- URL: `{{baseUrl}}/users/{{userId}}`

---

## 향후 추가될 API

### Authentication
- `POST /auth/register` - 회원가입
- `POST /auth/login` - 로그인
- `POST /auth/logout` - 로그아웃
- `POST /auth/refresh` - 토큰 갱신

### Categories
- `GET /categories` - 카테고리 목록
- `POST /categories` - 카테고리 생성
- `PATCH /categories/:id` - 카테고리 수정
- `DELETE /categories/:id` - 카테고리 삭제

### Transactions
- `GET /transactions` - 거래 내역 목록
- `POST /transactions` - 거래 내역 생성
- `GET /transactions/:id` - 거래 내역 상세
- `PATCH /transactions/:id` - 거래 내역 수정
- `DELETE /transactions/:id` - 거래 내역 삭제

### Files
- `POST /files/upload` - 파일 업로드
- `GET /files` - 파일 목록
- `DELETE /files/:id` - 파일 삭제
