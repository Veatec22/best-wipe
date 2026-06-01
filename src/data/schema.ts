export const SCHEMA_ERD_DAY1 = `erDiagram
    COUNTRIES ||--o{ USERS : ""
    USERS ||--o{ SALES : ""
    USERS ||--o{ COMPLAINTS : ""
    PRODUCTS ||--o{ SALES : ""
    PRODUCTS ||--o{ REFUNDS : ""
    CAMPAIGNS ||--o{ SALES : ""
    AFFILIATES ||--o{ SALES : ""
    SALES ||--o{ REFUNDS : ""

    USERS {
        int id PK
        date registration_date
        string name
        string surname
        int country_id FK
        boolean is_test
        date date_of_birth
        string gender
        string city
    }

    COUNTRIES {
        int id PK
        string country_name
    }

    PRODUCTS {
        int id PK
        string name
        string type
        decimal base_price
    }

    CAMPAIGNS {
        int id PK
        string name
        string channel
        date start_date
        date end_date
    }

    AFFILIATES {
        int id PK
        string name
        string channel
    }

    SALES {
        int id PK
        timestamp transaction_date
        int user_id FK
        int order_id
        int product_id FK
        int campaign_id FK
        int affiliate_id FK
        decimal net
        decimal tax
        decimal gross
    }

    REFUNDS {
        int id PK
        int order_id FK
        int product_id FK
        date refund_date
        decimal amount
        string reason
    }

    COMPLAINTS {
        int id PK
        int user_id FK
        date date
        string message
    }
`;
