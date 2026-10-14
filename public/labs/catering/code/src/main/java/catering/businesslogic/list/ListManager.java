package catering.businesslogic.list;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.logging.Logger;

import catering.businesslogic.UseCaseLogicException;
import catering.persistence.PersistenceManager;
import catering.persistence.ResultHandler;
import catering.util.LogManager;

/**
 * Central manager for staff operations.
 * Provides factory methods for creating Staff and EventStaff instances,
 * and handles event notifications to registered receivers.
 */
public class ListManager {

    // Interface for managing the complete staff workforce
    public interface FullStaff {
        void hireStaffMember(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays) throws UseCaseLogicException;
        void fireStaffMember(String taxID) throws UseCaseLogicException;
        void editStaffMember(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays) throws UseCaseLogicException;
        void setStaffBusy(String taxID, boolean busy);
    }

    // Interface for managing staff assignments to events
    public interface EventStaff {
        void addStaffMember(String taxID) throws UseCaseLogicException;
        void removeStaffMember(String taxID) throws UseCaseLogicException;
    }
    
    private static final Logger LOGGER = LogManager.getLogger(ListManager.class);
    private FullStaff fullStaff;
    private EventStaff currentStaff;
    private ArrayList<ListEventReceiver> eventReceivers;

    public ListManager() {
        eventReceivers = new ArrayList<>();
    }

    /**
     * Adds an event receiver to be notified of list changes
     * @param receiver The receiver to add
     */
    public void addEventReceiver(ListEventReceiver receiver) {
        if (receiver != null && !eventReceivers.contains(receiver)) {
            eventReceivers.add(receiver);
        }
    }

    /**
     * Removes an event receiver
     * @param receiver The receiver to remove
     */
    public void removeEventReceiver(ListEventReceiver receiver) {
        eventReceivers.remove(receiver);
    }

    // Notification methods

    public void notifyStaffHired(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays) {
        for (ListEventReceiver receiver : eventReceivers) {
            receiver.updateStaffHired(taxID, name, surname, busy, occasional, role, vacationDays);
        }
    }

    public void notifyStaffFired(String taxID) {
        for (ListEventReceiver receiver : eventReceivers) {
            receiver.updateStaffFired(taxID);
        }
    }

    public void notifyStaffEdited(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays) {
        for (ListEventReceiver receiver : eventReceivers) {
            receiver.updateStaffEdited(taxID, name, surname, busy, occasional, role, vacationDays);
        }
    }

    public void notifyStaffAddedToEvent(String taxID, int eventID) {
        for (ListEventReceiver receiver : eventReceivers) {
            receiver.updateStaffAddedToEvent(taxID, eventID);
        }
    }

    public void notifyStaffRemovedFromEvent(String taxID, int eventID) {
        for (ListEventReceiver receiver : eventReceivers) {
            receiver.updateStaffRemovedFromEvent(taxID, eventID);
        }
    }

    public void notifyStaffBusyStatusChanged(String taxID, boolean busy) {
        for (ListEventReceiver receiver : eventReceivers) {
            receiver.updateStaffBusyStatusChanged(taxID, busy);
        }
    }

    public void notifyStaffVacationDaysEdited(String taxID, int vacationDays) {
        for (ListEventReceiver receiver : eventReceivers) {
            receiver.updateStaffVacationDaysEdited(taxID, vacationDays);
        }
    }

    public EventStaff createCurrentStaff(int eventID, int staffNeeded) {
        LOGGER.info("Creating CurrentStaff for event " + eventID + " with " + staffNeeded + " staff needed");
        currentStaff = new CurrentStaff(staffNeeded, eventID, this);
        System.out.println("=== Event " + eventID + " requires " + staffNeeded + " staff members ===");
        return currentStaff;
    }

    public void setStaffBusy(String taxID, boolean busy) {
        if (fullStaff != null) {
            LOGGER.fine("Setting staff " + taxID + " busy status to " + busy);
            fullStaff.setStaffBusy(taxID, busy);
        } else {
            LOGGER.warning("Cannot set staff busy status: fullStaff is null");
        }
    }

    public FullStaff createFullStaff() {
        LOGGER.info("Creating FullStaff instance");
        fullStaff = new Staff(this);
        return fullStaff;
    }

    // Prints all staff members assigned to an event
    public void stampStaff(int eventID) {
        LOGGER.info("Stamping staff for event " + eventID);
        
        // Get staffNeeded if currentStaff exists for this event
        if (currentStaff != null && currentStaff instanceof CurrentStaff) {
            CurrentStaff cs = (CurrentStaff) currentStaff;
            if (cs.getEventID() == eventID) {
                System.out.println("=== Staff needed for event " + eventID + ": " + cs.getStaffNeeded() + " ===");
            }
        }
        
        ArrayList<String> aux = new ArrayList<>();
        String query = "SELECT taxID FROM EventStaff WHERE eventID = ?";
        PersistenceManager.executeQuery(query, new ResultHandler() {
            @Override
            public void handle(ResultSet rs) throws SQLException {
                while (rs.next()) {
                    aux.add(rs.getString("taxID"));
                }
            }
        }, eventID);
        LOGGER.fine("Found " + aux.size() + " staff members for event " + eventID);

        query = "SELECT taxID, name, surname, role FROM Staff WHERE taxID = ?";
        for (String taxID : aux) {
            PersistenceManager.executeQuery(query, new ResultHandler() {
                @Override
                public void handle(ResultSet rs) throws SQLException {
                    while (rs.next()) {
                        String staffInfo = "Staff Member: " + rs.getString("name") + " " + rs.getString("surname") + 
                                         ", Role: " + rs.getString("role") + ", taxID: " + rs.getString("taxID");
                        System.out.println(staffInfo);
                    }
                }
            }, taxID);
        }
    }

}