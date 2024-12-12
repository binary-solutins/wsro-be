CREATE TABLE Users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role ENUM('admin', 'customer') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Competitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(255) NOT NULL,
  category ENUM('Regional', 'National', 'International') NOT NULL,
  rules TEXT NOT NULL,
  track_details TEXT NOT NULL,
  manual_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Regions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  region_name VARCHAR(255) NOT NULL,
  event_date DATE NOT NULL,
  venue VARCHAR(255) NOT NULL,
  competition_id INT NOT NULL,
  FOREIGN KEY (competition_id) REFERENCES Competitions(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE Registrations (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  competition_id INT NOT NULL,
  region_id INT NOT NULL,
  team_code VARCHAR(255),
  participant_id VARCHAR(255) NOT NULL,
  status ENUM('pending', 'confirmed', 'cancelled') NOT NULL,
  payment_status ENUM('paid', 'unpaid') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES Users(id),
  FOREIGN KEY (competition_id) REFERENCES Competitions(id),
  FOREIGN KEY (region_id) REFERENCES Regions(id)
);

CREATE TABLE Payments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  registration_id INT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  transaction_id VARCHAR(255) NOT NULL,
  payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  status ENUM('success', 'failed') NOT NULL,
  FOREIGN KEY (registration_id) REFERENCES Registrations(id)
);

CREATE TABLE Certificates (
  id INT PRIMARY KEY AUTO_INCREMENT,
  registration_id INT NOT NULL,
  certificate_url VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES Registrations(id)
);

CREATE TABLE EventPass (
  id INT PRIMARY KEY AUTO_INCREMENT,
  registration_id INT NOT NULL,
  pass_url VARCHAR(255) NOT NULL,
  qr_code VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (registration_id) REFERENCES Registrations(id)
);