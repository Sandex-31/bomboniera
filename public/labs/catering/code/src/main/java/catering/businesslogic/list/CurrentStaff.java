package catering.businesslogic.list;

import java.util.logging.Level;
import java.util.logging.Logger;

import catering.businesslogic.CatERing;
import catering.businesslogic.UseCaseLogicException;
import catering.businesslogic.user.User;
import catering.persistence.PersistenceManager;
import catering.util.LogManager;

/**
 * Manages staff assignments for a specific event.
 * Handles adding and removing staff from events. Only organizers can do these operations.
 */
public class CurrentStaff implements ListManager.EventStaff {

    private static final Logger LOGGER = LogManager.getLogger(CurrentStaff.class);
    private int eventID;
    private int staffNeeded;
    private ListManager listManager;

    public CurrentStaff(int staffNeeded, int eventID, ListManager listManager) {
        this.staffNeeded = staffNeeded;
        this.eventID = eventID;
        this.listManager = listManager;
        String message = "CurrentStaff created for eventID: " + eventID + " with staffNeeded: " + staffNeeded;
        LOGGER.info(message);
        System.out.println(message);
    }
    
    public int getStaffNeeded() {
        return staffNeeded;
    }
    
    public int getEventID() {
        return eventID;
    }

    /**
     * Assigns a staff member to this event. Only organizers can do this.
     * Updates the staff member's busy status to true.
     */
    public void addStaffMember(String taxID) throws UseCaseLogicException {
        User currentUser = CatERing.getInstance().getUserManager().getCurrentUser();
        if (currentUser == null || !currentUser.isOrganizer()) {
            throw new UseCaseLogicException("Only organizers can assign staff to events");
        }
        try {
            String query = "INSERT INTO EventStaff (eventID, taxID) VALUES (?, ?)";
            if (PersistenceManager.executeUpdate(query, this.eventID, taxID) > 0) {
                LOGGER.info("Added staff member " + taxID + " to event " + this.eventID);
                System.out.println("Staff needed for event " + this.eventID + ": " + this.staffNeeded);
                if (listManager != null) {
                    listManager.setStaffBusy(taxID, true);
                    listManager.notifyStaffAddedToEvent(taxID, this.eventID);
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error adding staff member " + taxID + " to event " + this.eventID, e);
        }
    }

    /**
     * Removes a staff member from this event. Only organizers can do this.
     * Updates the staff member's busy status to false.
     */
    public void removeStaffMember(String taxID) throws UseCaseLogicException {
        User currentUser = CatERing.getInstance().getUserManager().getCurrentUser();
        if (currentUser == null || !currentUser.isOrganizer()) {
            throw new UseCaseLogicException("Only organizers can remove staff from events");
        }
        try {
            String query = "DELETE FROM EventStaff WHERE taxID = ?";
            if (PersistenceManager.executeUpdate(query, taxID) > 0) {
                LOGGER.info("Removed staff member " + taxID + " from event " + this.eventID);
                System.out.println("Staff needed for event " + this.eventID + ": " + this.staffNeeded);
                if (listManager != null) {
                    listManager.setStaffBusy(taxID, false);
                    listManager.notifyStaffRemovedFromEvent(taxID, this.eventID);
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error removing staff member " + taxID + " from event " + this.eventID, e);
        }
    }
}
