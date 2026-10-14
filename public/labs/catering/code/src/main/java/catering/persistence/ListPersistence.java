package catering.persistence;

import catering.businesslogic.list.ListEventReceiver;
import catering.util.LogManager;
import java.util.logging.Logger;

/**
 * Persistence class for List operations.
 * Note: The actual database operations are already handled by Staff and CurrentStaff classes.
 * This receiver is here for logging and potential future extensions (e.g., caching, auditing).
 */
public class ListPersistence implements ListEventReceiver {

    private static final Logger LOGGER = LogManager.getLogger(ListPersistence.class);

    @Override
    public void updateStaffHired(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays) {
        LOGGER.fine("Staff hired - taxID: " + taxID + ", name: " + name + " " + surname + ", role: " + role);
        // Database operation already performed by Staff class
    }

    @Override
    public void updateStaffFired(String taxID) {
        LOGGER.fine("Staff fired - taxID: " + taxID);
        // Database operation already performed by Staff class
    }

    @Override
    public void updateStaffEdited(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays) {
        LOGGER.fine("Staff edited - taxID: " + taxID + ", name: " + name + " " + surname);
        // Database operation already performed by Staff class
    }

    @Override
    public void updateStaffAddedToEvent(String taxID, int eventID) {
        LOGGER.fine("Staff added to event - taxID: " + taxID + ", eventID: " + eventID);
        // Database operation already performed by CurrentStaff class
    }

    @Override
    public void updateStaffRemovedFromEvent(String taxID, int eventID) {
        LOGGER.fine("Staff removed from event - taxID: " + taxID + ", eventID: " + eventID);
        // Database operation already performed by CurrentStaff class
    }

    @Override
    public void updateStaffBusyStatusChanged(String taxID, boolean busy) {
        LOGGER.fine("Staff busy status changed - taxID: " + taxID + ", busy: " + busy);
        // Database operation already performed by Staff class
    }

    @Override
    public void updateStaffVacationDaysEdited(String taxID, int vacationDays) {
        LOGGER.fine("Staff vacation days edited - taxID: " + taxID + ", vacationDays: " + vacationDays);
        // Database operation already performed by Staff class
    }
}
