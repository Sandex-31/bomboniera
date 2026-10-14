package catering.businesslogic.list;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import catering.businesslogic.CatERing;
import catering.businesslogic.UseCaseLogicException;
import catering.businesslogic.event.Event;
import catering.businesslogic.list.ListManager.EventStaff;
import catering.businesslogic.list.ListManager.FullStaff;
import catering.businesslogic.user.User;
import catering.persistence.PersistenceManager;
import catering.util.LogManager;

import java.util.logging.Logger;

public class StaffAuthorizationTest {

    private static final Logger LOGGER = LogManager.getLogger(StaffAuthorizationTest.class);

    private static CatERing app;
    private static User chef;
    private static User organizer;
    private static Event testEvent;

    @BeforeAll
    static void init() {
        PersistenceManager.initializeDatabase("database/catering_init_sqlite.sql");
        app = CatERing.getInstance();
    }

    @BeforeEach
    void setup() {
        // Cleanup before test
        try {
            PersistenceManager.executeUpdate("DELETE FROM EventStaff WHERE taxID LIKE 'TEST_%'");
            PersistenceManager.executeUpdate("DELETE FROM Staff WHERE taxID LIKE 'TEST_%'");
        } catch (Exception e) {
            LOGGER.warning("Pre-test cleanup failed: " + e.getMessage());
        }

        try {
            // Load users
            chef = User.load("Antonio");
            assertNotNull(chef, "Chef user should be loaded");
            assertTrue(chef.isChef(), "User should have chef role");
            assertFalse(chef.isOrganizer(), "Chef should not be an organizer");

            organizer = User.load("Giovanni");
            assertNotNull(organizer, "Organizer user should be loaded");
            assertTrue(organizer.isOrganizer(), "User should have organizer role");

            testEvent = Event.loadByName("Gala Aziendale Annuale");
            assertNotNull(testEvent, "Test event should be loaded");

        } catch (Exception e) {
            LOGGER.severe("Setup failed: " + e.getMessage());
        }
    }

    @AfterEach
    void cleanup() {
        try {
            PersistenceManager.executeUpdate("DELETE FROM EventStaff WHERE taxID LIKE 'TEST_%'");
            PersistenceManager.executeUpdate("DELETE FROM Staff WHERE taxID LIKE 'TEST_%'");
        } catch (Exception e) {
            LOGGER.warning("Cleanup failed: " + e.getMessage());
        }
    }

    @Test
    void testNonOrganizerCannotHireStaff() {
        LOGGER.info("Testing that non-organizer cannot hire staff");

        try {
            // Login as chef (non-organizer)
            app.getUserManager().fakeLogin(chef.getUserName());
            
            ListManager listManager = app.getListManager();
            FullStaff fullStaff = listManager.createFullStaff();
            
            String taxID = "TEST_HIRE_" + System.currentTimeMillis();

            // Try to hire as chef - should throw exception
            UseCaseLogicException exception = assertThrows(UseCaseLogicException.class, () -> {
                fullStaff.hireStaffMember(taxID, "Unauthorized", "User", false, false, "Waiter", 26);
            });
            
            assertEquals("Only organizers can hire staff members", exception.getMessage());
            LOGGER.info("Authorization check passed: " + exception.getMessage());

        } catch (Exception e) {
            fail("Unexpected exception: " + e.getMessage());
        }
    }

    @Test
    void testNonOrganizerCannotEditStaff() {
        LOGGER.info("Testing that non-organizer cannot edit staff");

        try {
            String taxID = "TEST_EDIT_" + System.currentTimeMillis();
            
            // Login as organizer to hire first
            app.getUserManager().fakeLogin(organizer.getUserName());
            ListManager listManager = app.getListManager();
            FullStaff fullStaff = listManager.createFullStaff();
            fullStaff.hireStaffMember(taxID, "Auth", "Test", false, false, "Waiter", 26);

            // Login as chef and try to edit - should throw exception
            app.getUserManager().fakeLogin(chef.getUserName());
            UseCaseLogicException exception = assertThrows(UseCaseLogicException.class, () -> {
                fullStaff.editStaffMember(taxID, "Auth", "Test", true, false, "Waiter", 20);
            });
            
            assertEquals("Only organizers can edit staff members", exception.getMessage());
            LOGGER.info("Authorization check passed: " + exception.getMessage());

            // Cleanup
            app.getUserManager().fakeLogin(organizer.getUserName());
            fullStaff.fireStaffMember(taxID);

        } catch (Exception e) {
            fail("Unexpected exception: " + e.getMessage());
        }
    }

    @Test
    void testNonOrganizerCannotFireStaff() {
        LOGGER.info("Testing that non-organizer cannot fire staff");

        try {
            String taxID = "TEST_FIRE_" + System.currentTimeMillis();
            
            // Login as organizer to hire first
            app.getUserManager().fakeLogin(organizer.getUserName());
            ListManager listManager = app.getListManager();
            FullStaff fullStaff = listManager.createFullStaff();
            fullStaff.hireStaffMember(taxID, "Auth", "Test", false, false, "Waiter", 26);

            // Login as chef and try to fire - should throw exception
            app.getUserManager().fakeLogin(chef.getUserName());
            UseCaseLogicException exception = assertThrows(UseCaseLogicException.class, () -> {
                fullStaff.fireStaffMember(taxID);
            });
            
            assertEquals("Only organizers can fire staff members", exception.getMessage());
            LOGGER.info("Authorization check passed: " + exception.getMessage());

            // Cleanup
            app.getUserManager().fakeLogin(organizer.getUserName());
            fullStaff.fireStaffMember(taxID);

        } catch (Exception e) {
            fail("Unexpected exception: " + e.getMessage());
        }
    }

    @Test
    void testNonOrganizerCannotAssignStaffToEvent() {
        LOGGER.info("Testing that non-organizer cannot assign staff to events");

        try {
            String taxID = "TEST_ASSIGN_" + System.currentTimeMillis();
            
            // Login as organizer to hire staff and create event staff
            app.getUserManager().fakeLogin(organizer.getUserName());
            ListManager listManager = app.getListManager();
            FullStaff fullStaff = listManager.createFullStaff();
            fullStaff.hireStaffMember(taxID, "Auth", "Test", false, false, "Waiter", 26);
            
            EventStaff eventStaff = listManager.createCurrentStaff(testEvent.getId(), 5);

            // Login as chef and try to add staff to event - should throw exception
            app.getUserManager().fakeLogin(chef.getUserName());
            UseCaseLogicException exception = assertThrows(UseCaseLogicException.class, () -> {
                eventStaff.addStaffMember(taxID);
            });
            
            assertEquals("Only organizers can assign staff to events", exception.getMessage());
            LOGGER.info("Authorization check passed: " + exception.getMessage());

            // Cleanup
            app.getUserManager().fakeLogin(organizer.getUserName());
            fullStaff.fireStaffMember(taxID);

        } catch (Exception e) {
            fail("Unexpected exception: " + e.getMessage());
        }
    }

    @Test
    void testOrganizerCanPerformAllOperations() {
        LOGGER.info("Testing that organizer can perform all staff operations");

        try {
            String taxID = "TEST_ORG_" + System.currentTimeMillis();
            
            // Login as organizer
            app.getUserManager().fakeLogin(organizer.getUserName());
            ListManager listManager = app.getListManager();
            FullStaff fullStaff = listManager.createFullStaff();
            
            // Hire
            fullStaff.hireStaffMember(taxID, "Org", "Test", false, false, "Waiter", 26);
            LOGGER.info("Organizer successfully hired staff");

            // Edit
            fullStaff.editStaffMember(taxID, "Org", "Test", true, false, "Waiter", 20);
            LOGGER.info("Organizer successfully edited staff");

            // Assign to event
            EventStaff eventStaff = listManager.createCurrentStaff(testEvent.getId(), 5);
            eventStaff.addStaffMember(taxID);
            LOGGER.info("Organizer successfully assigned staff to event");

            // Remove from event
            eventStaff.removeStaffMember(taxID);
            LOGGER.info("Organizer successfully removed staff from event");

            // Fire
            fullStaff.fireStaffMember(taxID);
            LOGGER.info("Organizer successfully fired staff");

            LOGGER.info("All organizer operations completed successfully");

        } catch (Exception e) {
            fail("Organizer should be able to perform all operations: " + e.getMessage());
        }
    }
}
