package catering.businesslogic.list;

import java.sql.SQLException;
import java.util.logging.Level;
import java.util.logging.Logger;

import catering.businesslogic.CatERing;
import catering.businesslogic.UseCaseLogicException;
import catering.businesslogic.user.User;
import catering.persistence.PersistenceManager;
import catering.util.LogManager;

/**
 * Manages staff members in the catering system.
 * Handles hiring, firing, and editing staff information.
 * All operations require organizer authorization.
 */
public class Staff implements ListManager.FullStaff {
    
    private static final Logger LOGGER = LogManager.getLogger(Staff.class);
    private ListManager listManager;
    
    public Staff() {
        // Default constructor
    }
    
    /**
     * Creates a Staff instance with event notification support.
     */
    public Staff(ListManager listManager) {
        this.listManager = listManager;
    }
    
    /**
     * Hires a new staff member. Only organizers can do this.
     * The staff member is added to the database and event receivers are notified.
     */
    public void hireStaffMember(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays) throws UseCaseLogicException {
        User currentUser = CatERing.getInstance().getUserManager().getCurrentUser();
        if (currentUser == null || !currentUser.isOrganizer()) {
            throw new UseCaseLogicException("Only organizers can hire staff members");
        }
        try {
            String query = "INSERT INTO Staff (taxID, name, surname, busy, occasional, role, vacationDays) VALUES (?, ?, ?, ?, ?, ?, ?)";
            if (PersistenceManager.executeUpdate(query, taxID, name, surname, busy, occasional, role, vacationDays) > 0) {
                LOGGER.info("Hired staff member: " + name + " " + surname + " (taxID: " + taxID + ")");
                if (listManager != null) {
                    listManager.notifyStaffHired(taxID, name, surname, busy, occasional, role, vacationDays);
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error hiring staff member " + name + " " + surname, e);
        }
    }

    /**
     * Fires a staff member. Only organizers can do this.
     * Removes the staff member from the database.
     */
    public void fireStaffMember(String taxID) throws UseCaseLogicException {
        User currentUser = CatERing.getInstance().getUserManager().getCurrentUser();
        if (currentUser == null || !currentUser.isOrganizer()) {
            throw new UseCaseLogicException("Only organizers can fire staff members");
        }
        try {
            String query = "DELETE FROM Staff WHERE taxID = ?";
            if (PersistenceManager.executeUpdate(query, taxID) > 0) {
                LOGGER.info("Fired staff member (taxID: " + taxID + ")");
                if (listManager != null) {
                    listManager.notifyStaffFired(taxID);
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error firing staff member " + taxID, e);
        }
    }

    /**
     * Updates staff member information. Only organizers can do this.
     */
    public void editStaffMember(String taxID, String name, String surname, boolean busy, boolean occasional, String role, int vacationDays) throws UseCaseLogicException {
        User currentUser = CatERing.getInstance().getUserManager().getCurrentUser();
        if (currentUser == null || !currentUser.isOrganizer()) {
            throw new UseCaseLogicException("Only organizers can edit staff members");
        }
        try {
            String query = "UPDATE Staff SET name = ?, surname = ?, busy = ?, occasional = ?, role = ?, vacationDays = ? WHERE taxID = ?";
            if (PersistenceManager.executeUpdate(query, name, surname, busy, occasional, role, vacationDays, taxID) > 0) {
                LOGGER.info("Edited staff member (taxID: " + taxID + ")");
                if (listManager != null) {
                    listManager.notifyStaffEdited(taxID, name, surname, busy, occasional, role, vacationDays);
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error editing staff member " + taxID, e);
        }
    }

    /**
     * Prints all staff members to console.
     */
    public void stampStaff() {
        try {
            String query = "SELECT taxID, name, surname, role, busy, occasional, vacationDays FROM Staff";
            PersistenceManager.executeQuery(query, rs -> {
                try {
                    while (rs.next()) {
                        String staffInfo = "Staff Member: " + rs.getString("name") + " " + rs.getString("surname") +
                                           ", Role: " + rs.getString("role") +
                                           ", Busy: " + rs.getBoolean("busy") +
                                           ", Occasional: " + rs.getBoolean("occasional") +
                                           ", Vacation Days: " + rs.getInt("vacationDays") +
                                           ", taxID: " + rs.getString("taxID");
                        LOGGER.fine(staffInfo);
                        System.out.println(staffInfo);
                    }
                } catch (SQLException e) {
                    LOGGER.log(Level.SEVERE, "Error processing staff members", e);
                }
            });
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error retrieving staff members", e);
        }
    }

    /**
     * Subtracts vacation days from a staff member's balance.
     */
    public void editVacationDays(String taxID, int vacationDays) {
        try {
            LOGGER.fine("Editing vacation days for staff member (taxID: " + taxID + "): " + vacationDays + " days");
            String query = "SELECT vacationDays FROM Staff WHERE taxID = ?";
            PersistenceManager.executeQuery(query, rs -> {
                try {
                    if (rs.next()) {
                        int currentDays = rs.getInt("vacationDays");
                        int newDays = currentDays - vacationDays;
                        String updateQuery = "UPDATE Staff SET vacationDays = ? WHERE taxID = ?";
                        if (PersistenceManager.executeUpdate(updateQuery, newDays, taxID) > 0) {
                            LOGGER.info("Updated vacation days for staff (taxID: " + taxID + ") to " + newDays);
                            if (listManager != null) {
                                listManager.notifyStaffVacationDaysEdited(taxID, newDays);
                            }
                        }
                    }
                } catch (SQLException e) {
                    LOGGER.log(Level.SEVERE, "Error updating vacation days for staff member " + taxID, e);
                }
            }, taxID);
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error editing vacation days for staff member " + taxID, e);
        }
    }

    /**
     * Updates staff member's busy status.
     */
    public void setStaffBusy(String taxID, boolean busy) {
        try {
            String query = "UPDATE Staff SET busy = ? WHERE taxID = ?";
            if (PersistenceManager.executeUpdate(query, busy, taxID) > 0) {
                LOGGER.fine("Updated busy status for staff (taxID: " + taxID + ") to " + busy);
                if (listManager != null) {
                    listManager.notifyStaffBusyStatusChanged(taxID, busy);
                }
            }
        } catch (Exception e) {
            LOGGER.log(Level.SEVERE, "Error updating busy status for staff member " + taxID, e);
        }
    }
}
