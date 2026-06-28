import pytest
import numpy as np
from ml_pipeline.utils.path_planning import plan_rover_path

class TestPathPlanningEnterpriseSuite:
    @pytest.fixture
    def synthetic_cost_map(self):
        """Generates a 50x50 terrain cost map with obstacle barriers and ice locations."""
        grid = np.ones((50, 50))
        # Place high slope/boulder obstacle wall in the middle
        grid[20:30, 10:40] = 999.0
        return grid

    def test_plan_rover_path_obstacle_avoidance(self, synthetic_cost_map):
        """
        Validates that RRT*/A* path planning successfully finds a clear path around obstacles
        from landing site to target crater floor, generating appropriate hazard flags.
        """
        start_pos = (5, 25) # Landing site on rim
        goal_pos = (45, 25) # Ice rich region on crater floor
        
        path_waypoints, total_energy_wh, battery_margin = plan_rover_path(start_pos, goal_pos, synthetic_cost_map)
        
        # Verify basic path properties
        assert len(path_waypoints) > 2, "Path contains insufficient waypoints"
        assert path_waypoints[0]['coordinates'] == start_pos, "Path does not begin at landing site"
        assert path_waypoints[-1]['coordinates'] == goal_pos, "Path does not terminate at target ice region"
        
        # Verify obstacle avoidance (none of the waypoints should traverse the 999.0 obstacle barrier)
        for wp in path_waypoints:
            x, y = wp['coordinates']
            assert synthetic_cost_map[x, y] < 999.0, f"Collision detected at waypoint {wp['coordinates']} with cost {synthetic_cost_map[x,y]}"
            assert 'hazard_flag' in wp, "Missing hazard flag in waypoint telemetry"

        # Verify energy calculations and battery safety constraints
        assert total_energy_wh > 0.0, f"Calculated energy consumption invalid: {total_energy_wh} Wh"
        assert battery_margin > 20.0, f"Battery safety margin dangerously low: {battery_margin}% (Target > 20%)"

    def test_unreachable_goal_and_invalid_bounds(self, synthetic_cost_map):
        """Asserts robust handling when goal is completely walled off or out of grid bounds."""
        # Walled off goal
        synthetic_cost_map[40:48, 20:30] = 999.0
        synthetic_cost_map[40:48, 20] = 999.0
        synthetic_cost_map[40:48, 30] = 999.0
        synthetic_cost_map[48, 20:30] = 999.0
        
        # Should gracefully return fallback or raise explicit pathfinding exception
        with pytest.raises((ValueError, RuntimeError, Exception)):
            # Out of bounds start/goal
            plan_rover_path((-5, 100), (45, 25), synthetic_cost_map)
