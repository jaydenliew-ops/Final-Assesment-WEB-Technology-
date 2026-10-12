-- Optional development sample data. Does not duplicate existing project/unit pairs.
INSERT INTO housing_units (project_name, unit_number, price_myr, bedrooms, latitude, longitude)
SELECT 'Greenfield Heights', 'A-101', 350000, 2, '3.15169640', '101.69423710'
WHERE NOT EXISTS (SELECT 1 FROM housing_units WHERE project_name = 'Greenfield Heights' AND unit_number = 'A-101');
INSERT INTO housing_units (project_name, unit_number, price_myr, bedrooms, latitude, longitude)
SELECT 'Greenfield Heights', 'A-102', 380000, 3, '3.15169640', '101.69423710'
WHERE NOT EXISTS (SELECT 1 FROM housing_units WHERE project_name = 'Greenfield Heights' AND unit_number = 'A-102');
INSERT INTO housing_units (project_name, unit_number, price_myr, bedrooms, latitude, longitude)
SELECT 'Skyline Residence', 'B-201', 450000, 2, '3.11210000', '101.67380000'
WHERE NOT EXISTS (SELECT 1 FROM housing_units WHERE project_name = 'Skyline Residence' AND unit_number = 'B-201');
INSERT INTO housing_units (project_name, unit_number, price_myr, bedrooms, latitude, longitude)
SELECT 'Skyline Residence', 'B-202', 480000, 3, '3.11210000', '101.67380000'
WHERE NOT EXISTS (SELECT 1 FROM housing_units WHERE project_name = 'Skyline Residence' AND unit_number = 'B-202');
