-- Verwijder de incorrecte BEFORE INSERT trigger die de 409 Conflict veroorzaakt
DROP TRIGGER IF EXISTS auto_create_program_for_accommodation ON accommodation_requests;