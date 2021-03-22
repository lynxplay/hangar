package io.papermc.hangar.model.internal.user;

import io.papermc.hangar.model.Identified;
import io.papermc.hangar.model.api.User;
import io.papermc.hangar.model.common.Permission;
import io.papermc.hangar.model.common.roles.GlobalRole;

import java.time.OffsetDateTime;
import java.util.List;

public class HangarUser extends User implements Identified {

    private final long id;
    private HeaderData headerData;
    private final List<Integer> readPrompts;
    private final boolean locked;
    private final String language;

    public HangarUser(OffsetDateTime createdAt, String name, String tagline, OffsetDateTime joinDate, List<GlobalRole> roles, long projectCount, long id, List<Integer> readPrompts, boolean locked, String language) {
        super(createdAt, name, tagline, joinDate, roles, projectCount);
        this.id = id;
        this.readPrompts = readPrompts;
        this.locked = locked;
        this.language = language;
    }

    @Override
    public long getId() {
        return id;
    }

    public HeaderData getHeaderData() {
        return headerData;
    }

    public void setHeaderData(HeaderData headerData) {
        this.headerData = headerData;
    }

    public List<Integer> getReadPrompts() {
        return readPrompts;
    }

    public boolean isLocked() {
        return locked;
    }

    public String getLanguage() {
        return language;
    }

    public User toUser() {
        return new User(
                this.getCreatedAt(),
                this.getName(),
                this.getTagline(),
                this.getJoinDate(),
                this.getRoles(),
                this.getProjectCount());
    }

    public static class HeaderData {
        private final Permission globalPermission;
        private final long unreadNotifications;
        private final long unansweredInvites;
        private final long unresolvedFlags;
        private final long projectApprovals;
        private final long reviewQueueCount;

        public HeaderData(Permission globalPermission, long unreadNotifications, long unansweredInvites, long unresolvedFlags, long projectApprovals, long reviewQueueCount) {
            this.globalPermission = globalPermission;
            this.unreadNotifications = unreadNotifications;
            this.unansweredInvites = unansweredInvites;
            this.unresolvedFlags = unresolvedFlags;
            this.projectApprovals = projectApprovals;
            this.reviewQueueCount = reviewQueueCount;
        }

        public Permission getGlobalPermission() {
            return globalPermission;
        }

        public long getUnreadNotifications() {
            return unreadNotifications;
        }

        public long getUnansweredInvites() {
            return unansweredInvites;
        }

        public long getUnresolvedFlags() {
            return unresolvedFlags;
        }

        public long getProjectApprovals() {
            return projectApprovals;
        }

        public long getReviewQueueCount() {
            return reviewQueueCount;
        }

        @Override
        public String toString() {
            return "HeaderData{" +
                    "globalPermission=" + globalPermission +
                    ", unreadNotifications=" + unreadNotifications +
                    ", unansweredInvites=" + unansweredInvites +
                    ", unresolvedFlags=" + unresolvedFlags +
                    ", projectApprovals=" + projectApprovals +
                    ", reviewQueueCount=" + reviewQueueCount +
                    '}';
        }
    }
}
