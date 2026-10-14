package catering.businesslogic.kitchen;

import static org.junit.jupiter.api.Assertions.*;
import org.junit.jupiter.api.Order;
import org.junit.jupiter.api.TestMethodOrder;
import org.junit.jupiter.api.MethodOrderer.OrderAnnotation;

import java.sql.Date;
import java.sql.SQLException;
import java.sql.Time;
import java.util.logging.Logger;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import catering.businesslogic.CatERing;
import catering.businesslogic.UseCaseLogicException;
import catering.businesslogic.event.Event;
import catering.businesslogic.event.Service;
import catering.businesslogic.shift.Shift;
import catering.businesslogic.user.User;
import catering.businesslogic.list.ListManager;
import catering.businesslogic.list.ListManager.FullStaff;
import catering.businesslogic.list.ListManager.EventStaff;
import catering.persistence.PersistenceManager;
import catering.util.LogManager;

@TestMethodOrder(OrderAnnotation.class)
public class SummarySheetTest {

    private static final Logger LOGGER = LogManager.getLogger(SummarySheetTest.class);

    private static CatERing app;
    private static User chef;
    private static User cook;
    private static User organizer;
    private static Event testEvent;
    private static Service testService;

    @BeforeAll
    static void init() {
        PersistenceManager.initializeDatabase("database/catering_init_sqlite.sql");
        app = CatERing.getInstance();
    }

    @BeforeEach
    void setup() {
        // Add cleanup at the start to ensure no leftover test data
        try {
            PersistenceManager.executeUpdate("DELETE FROM EventStaff WHERE taxID LIKE 'TEST_%'");
            PersistenceManager.executeUpdate("DELETE FROM Staff WHERE taxID LIKE 'TEST_%'");
        } catch (Exception e) {
            LOGGER.warning("Pre-test cleanup failed: " + e.getMessage());
        }

        try {
            // Set up the chef user
            chef = User.load("Antonio");
            assertNotNull(chef, "Chef user should be loaded");
            assertTrue(chef.isChef(), "User should have chef role");

            // Set up the cook user
            cook = User.load("Luca");
            assertNotNull(cook, "Cook user should be loaded");

            // Set up the organizer user
            organizer = User.load("Giovanni");
            assertNotNull(organizer, "Organizer user should be loaded");
            assertTrue(organizer.isOrganizer(), "User should have organizer role");

            // Set up event and service
            testEvent = Event.loadByName("Gala Aziendale Annuale");
            assertNotNull(testEvent, "Test event should be loaded");

            testService = Service.loadByName("Pranzo Buffet Aziendale");
            assertNotNull(testService, "Test service should be loaded");

            // Login as chef
            app.getUserManager().fakeLogin(chef.getUserName());

            assertEquals(chef, app.getUserManager().getCurrentUser(), "Current user should be the chef");

        } catch (UseCaseLogicException e) {
            LOGGER.severe(e.getMessage());
        }

    }

    @AfterEach
    void cleanup() {
        // Clean up test staff from database
        try {
            PersistenceManager.executeUpdate("DELETE FROM EventStaff WHERE taxID LIKE 'TEST_%'");
            PersistenceManager.executeUpdate("DELETE FROM Staff WHERE taxID LIKE 'TEST_%'");
        } catch (Exception e) {
            LOGGER.warning("Cleanup failed: " + e.getMessage());
        }
    }

    @Test
    @Order(1)
    void testSummarySheetCreation() {
        LOGGER.info("Testing summary sheet creation");

        try {
            // Create summary sheet
            SummarySheet sheet = app.getKitchenTaskManager().generateSummarySheet(testEvent, testService);

            // Verify summary sheet was created properly
            assertNotNull(sheet, "Summary sheet should not be null");
            assertEquals(chef, sheet.getOwner(), "Sheet owner should be the chef who created it");
            assertNotNull(sheet.getTaskList(), "Task list should not be null");
            assertTrue(sheet.getTaskList().size() > 0, "Task list should contain tasks");

            LOGGER.info("Created summary sheet: " + sheet.toString());
        } catch (UseCaseLogicException e) {
            fail("Exception should not be thrown: " + e.getMessage());
        }
    }

    @Test
    @Order(2)
    void testTaskAssignment() {
        LOGGER.info("Testing task assignment to cook");

        try {
            // Create summary sheet
            SummarySheet sheet = app.getKitchenTaskManager().generateSummarySheet(testEvent, testService);
            assertNotNull(sheet, "Summary sheet should not be null");
            assertTrue(sheet.getTaskList().size() > 0, "Task list should contain tasks");

            // Get the first task
            KitchenTask taskToAssign = sheet.getTaskList().get(0);
            assertNotNull(taskToAssign, "Task to assign should not be null");

            // Create a shift
            Date shiftDate = Date.valueOf("2025-04-07");
            Time startTime = Time.valueOf("09:00:00");
            Time endTime = Time.valueOf("14:00:00");
            Shift shift = new Shift(shiftDate, startTime, endTime);
            shift.addBooking(cook);

            // Assign the task
            Assignment assignment = app.getKitchenTaskManager().assignTask(taskToAssign, shift, cook);

            // Verify assignment
            assertNotNull(assignment, "Assignment should not be null");
            assertEquals(taskToAssign, assignment.getTask(), "Assignment should reference the correct task");
            assertEquals(cook, assignment.getCook(), "Assignment should reference the correct cook");
            assertEquals(shift, assignment.getShift(), "Assignment should reference the correct shift");

            // Verify assignment is in sheet's assignment list
            assertTrue(sheet.getAssignments().contains(assignment),
                    "Sheet's assignment list should contain the new assignment");

            LOGGER.info("Successfully assigned task. Assignment details: " +
                    "Task: " + assignment.getTask().getDescription() +
                    ", Cook: " + assignment.getCook().getUserName() +
                    ", Shift: " + assignment.getShift().getDate() + " " +
                    assignment.getShift().getStartTime() + "-" +
                    assignment.getShift().getEndTime());

            LOGGER.info(sheet.toString());
        } catch (UseCaseLogicException e) {
            fail("Exception should not be thrown: " + e.getMessage());
        }
    }
    
    @Test
    @Order(3)
    void testFullStaffCreationAndHiring() {
        LOGGER.info("Testing FullStaff creation and staff hiring");

        try {
            // Login as organizer for staff operations
            app.getUserManager().fakeLogin(organizer.getUserName());
            
            ListManager listManager = app.getListManager();
            FullStaff fullStaff = listManager.createFullStaff();
            assertNotNull(fullStaff, "FullStaff should be created");

            // Hire a staff member with unique taxID (append timestamp for uniqueness)
            long timestamp = System.currentTimeMillis();
            String taxID = "TEST_HIRE_" + timestamp;
            fullStaff.hireStaffMember(taxID, "John", "Doe", false, false, "Chef", 10);

            // Verify in database
            String query = "SELECT COUNT(*) FROM Staff WHERE taxID = ?";
            final int[] count = {0};
            PersistenceManager.executeQuery(query, rs -> {
                try {
                    count[0] = rs.getInt(1);
                } catch (SQLException e) {
                    count[0] = 0;
                }
            }, taxID);
            assertEquals(1, count[0], "Staff member should be added to database");

            LOGGER.info("FullStaff created and staff hired successfully");
        } catch (Exception e) {
            fail("Exception should not be thrown: " + e.getMessage());
        }
    }

    @Test
    @Order(4)
    void testEventStaffCreationAndAssignment() {
        LOGGER.info("Testing EventStaff creation and staff assignment to event");

        try {
            // Login as organizer for staff operations
            app.getUserManager().fakeLogin(organizer.getUserName());
            
            ListManager listManager = app.getListManager();
            int eventID = testEvent.getId();
            EventStaff eventStaff = listManager.createCurrentStaff(eventID, 5);
            assertNotNull(eventStaff, "EventStaff should be created");

            // Add staff to event (use a taxID that exists or hire first)
            long timestamp = System.currentTimeMillis();
            String taxID = "TEST_ASSIGN_" + timestamp;
            // First hire the staff
            FullStaff fullStaff = listManager.createFullStaff();
            fullStaff.hireStaffMember(taxID, "Jane", "Assign", false, false, "Waiter", 5);

            eventStaff.addStaffMember(taxID);

            // Verify in database
            String query = "SELECT COUNT(*) FROM EventStaff WHERE taxID = ? AND eventID = ?";
            final int[] count = {0};
            PersistenceManager.executeQuery(query, rs -> {
                try {
                    count[0] = rs.getInt(1);
                } catch (SQLException e) {
                    count[0] = 0;
                }
            }, taxID, eventID);
            assertEquals(1, count[0], "Staff should be assigned to event in database");

            LOGGER.info("EventStaff created and staff assigned successfully");
        } catch (Exception e) {
            fail("Exception should not be thrown: " + e.getMessage());
        }
    }

    @Test
    @Order(5)
    void testStaffOperationsAndDatabaseUpdates() {
        LOGGER.info("Testing staff operations and database updates");

        try {
            // Login as organizer for staff operations
            app.getUserManager().fakeLogin(organizer.getUserName());
            
            ListManager listManager = app.getListManager();
            FullStaff fullStaff = listManager.createFullStaff();
            long timestamp = System.currentTimeMillis();
            String taxID = "TEST_OPS_" + timestamp;

            // Hire
            fullStaff.hireStaffMember(taxID, "Jane", "Smith", false, false, "Cook", 15);

            // Edit
            fullStaff.editStaffMember(taxID, "Jane", "Smith", true, false, "Cook", 12);

            // Verify edit in database
            String query = "SELECT busy, vacationDays FROM Staff WHERE taxID = ?";
            final boolean[] found = {false};
            PersistenceManager.executeQuery(query, rs -> {
                try {
                    found[0] = true;
                    assertTrue(rs.getBoolean("busy"), "Staff should be busy");
                    assertEquals(12, rs.getInt("vacationDays"), "Vacation days should be updated");
                } catch (SQLException e) {
                    fail("Database query failed: " + e.getMessage());
                }
            }, taxID);
            if (!found[0]) {
                fail("No staff found for taxID: " + taxID);
            }

            // Fire
            fullStaff.fireStaffMember(taxID);

            // Verify removal
            query = "SELECT COUNT(*) FROM Staff WHERE taxID = ?";
            final int[] count = {0};
            PersistenceManager.executeQuery(query, rs -> {
                try {
                    count[0] = rs.getInt(1);
                } catch (SQLException e) {
                    count[0] = 0;
                }
            }, taxID);
            assertEquals(0, count[0], "Staff should be removed from database");

            LOGGER.info("Staff operations and database updates verified");
        } catch (Exception e) {
            fail("Exception should not be thrown: " + e.getMessage());
        }
    }
}