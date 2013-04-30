/*
 * Copyright (C) 2011 The Android Open Source Project
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.actionbarsherlock.sample.styled;

import android.annotation.SuppressLint;
import android.annotation.TargetApi;
import android.app.ActionBar;
import android.app.ActionBar.OnNavigationListener;
import android.app.ActionBar.Tab;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.support.v4.app.FragmentActivity;
import android.support.v4.app.FragmentTransaction;
import android.view.ActionMode;
import android.view.Menu;
import android.view.MenuItem;
import android.view.MenuItem.OnMenuItemClickListener;
import android.view.View;
import android.view.Window;
import android.widget.ArrayAdapter;
import android.widget.Button;
import android.widget.Toast;

import com.example.actionbarstyleexample.R;

@SuppressLint("NewApi")
public class MainActivityICS extends FragmentActivity implements ActionBar.TabListener {

    private final Handler handler = new Handler();
//    private RoundedColourFragment leftFrag;
//    private RoundedColourFragment rightFrag;
    private boolean useLogo = false;
    private boolean showHomeUp = true;
    
    ActionMode mMode;
    
    Handler mHandler = new Handler();
    Runnable mProgressRunner = new Runnable() {
        @Override
        public void run() {
            mProgress += 2;

            //Normalize our progress along the progress bar's scale
            int progress = (Window.PROGRESS_END - Window.PROGRESS_START) / 100 * mProgress;
            setProgress(progress);

            if (mProgress < 100) {
                mHandler.postDelayed(mProgressRunner, 50);
            }
        }
    };

    private int mProgress = 100;

    /** Called when the activity is first created. */
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        requestWindowFeature(Window.FEATURE_PROGRESS);
        
        setContentView(R.layout.main);
        final ActionBar ab = getActionBar();

        // set defaults for logo & home up
        ab.setDisplayHomeAsUpEnabled(showHomeUp);
        ab.setDisplayUseLogoEnabled(useLogo);

        // set up tabs nav
        for (int i = 1; i < 4; i++) {
            ab.addTab(ab.newTab().setText("Tab " + i).setTabListener(this));
        }

        // set up list nav
        ab.setListNavigationCallbacks(ArrayAdapter
                .createFromResource(ab.getThemedContext(), R.array.sections,
                        android.R.layout.simple_spinner_dropdown_item),
//        		.createFromResource(this, R.array.sections,
//                      android.R.layout.simple_spinner_dropdown_item),
                new OnNavigationListener() {
        		@Override
                    public boolean onNavigationItemSelected(int itemPosition,
                            long itemId) {
                        // FIXME add proper implementation
                        //rotateLeftFrag();
                        return false;
                    }
                });

        // default to tab navigation
        showTabsNav();

        // create a couple of simple fragments as placeholders
//        final int MARGIN = 16;
//        leftFrag = new RoundedColourFragment(getResources().getColor(
//                R.color.android_green), 1f, MARGIN, MARGIN / 2, MARGIN, MARGIN);
//        rightFrag = new RoundedColourFragment(getResources().getColor(
//                R.color.honeycombish_blue), 2f, MARGIN / 2, MARGIN, MARGIN,
//                MARGIN);
//
//        FragmentTransaction ft = getSupportFragmentManager().beginTransaction();
//        ft.add(R.id.root, leftFrag);
//        ft.add(R.id.root, rightFrag);
//        ft.commit();
        
        
        ((Button)findViewById(R.id.start)).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                mMode = startActionMode(new AnActionModeOfEpicProportions());
            }
        });
        ((Button)findViewById(R.id.cancel)).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (mMode != null) {
                    mMode.finish();
                }
            }
        });
        
        ((Button)findViewById(R.id.progress)).setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
            	if (mProgress == 100) {
                    mProgress = 0;
                    mProgressRunner.run();
                }
            }
        });

        
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        getMenuInflater().inflate(R.menu.main_menu, menu);

        // set up a listener for the refresh item
        final MenuItem refresh = (MenuItem) menu.findItem(R.id.menu_refresh);
        refresh.setOnMenuItemClickListener(new OnMenuItemClickListener() {
            // on selecting show progress spinner for 1s
            public boolean onMenuItemClick(MenuItem item) {
                // item.setActionView(R.layout.progress_action);
                handler.postDelayed(new Runnable() {
                    public void run() {
                        refresh.setActionView(null);
                    }
                }, 1000);
                return false;
            }
        });
        return super.onCreateOptionsMenu(menu);
    }

    @Override
    public boolean onOptionsItemSelected(MenuItem item) {
        switch (item.getItemId()) {
        case android.R.id.home:
            // TODO handle clicking the app icon/logo
            return false;
        case R.id.menu_refresh:
            // switch to a progress animation
            item.setActionView(R.layout.indeterminate_progress_action);
            return true;
        case R.id.menu_both:
            // rotation animation of green fragment
//            rotateLeftFrag();
            return true;
        case R.id.menu_text:
            // alpha animation of blue fragment
//            ObjectAnimator alpha = ObjectAnimator.ofFloat(rightFrag.getView(),
//                    "alpha", 1f, 0f);
//            alpha.setRepeatMode(ObjectAnimator.REVERSE);
//            alpha.setRepeatCount(1);
//            alpha.setDuration(800);
//            alpha.start();
            return true;
        case R.id.menu_logo:
            useLogo = !useLogo;
            //item.setChecked(useLogo);
            getActionBar().setDisplayUseLogoEnabled(useLogo);
            return true;
        case R.id.menu_up:
            showHomeUp = !showHomeUp;
            //item.setChecked(showHomeUp);
            getActionBar().setDisplayHomeAsUpEnabled(showHomeUp);
            return true;
        case R.id.menu_nav_tabs:
            item.setChecked(true);
            showTabsNav();
            return true;
//        case R.id.menu_nav_label:
//            item.setChecked(true);
//            showStandardNav();
//            return true;
        case R.id.menu_nav_drop_down:
            item.setChecked(true);
            showDropDownNav();
            return true;
//        case R.id.menu_bak_none:
//            item.setChecked(true);
//            getSupportActionBar().setBackgroundDrawable(null);
//            return true;
//        case R.id.menu_bak_gradient:
//            item.setChecked(true);
//            getSupportActionBar().setBackgroundDrawable(getResources().getDrawable(R.drawable.ad_action_bar_gradient_bak));
//            return true;
        default:
            return super.onOptionsItemSelected(item);
        }
    }

//    private void rotateLeftFrag() {
//        if (leftFrag != null) {
////            ObjectAnimator.ofFloat(leftFrag.getView(), "rotationY", 0, 180)
////                    .setDuration(500).start();
//        }
//    }

    private void showStandardNav() {
        ActionBar ab = getActionBar();
        if (ab.getNavigationMode() != ActionBar.NAVIGATION_MODE_STANDARD) {
            ab.setDisplayShowTitleEnabled(true);
            ab.setNavigationMode(ActionBar.NAVIGATION_MODE_STANDARD);
        }
    }

    private void showDropDownNav() {
        ActionBar ab = getActionBar();
        if (ab.getNavigationMode() != ActionBar.NAVIGATION_MODE_LIST) {
            ab.setDisplayShowTitleEnabled(false);
            ab.setNavigationMode(ActionBar.NAVIGATION_MODE_LIST);
        }
    }

    private void showTabsNav() {
        ActionBar ab = getActionBar();
        if (ab.getNavigationMode() != ActionBar.NAVIGATION_MODE_TABS) {
            ab.setDisplayShowTitleEnabled(true);
            ab.setNavigationMode(ActionBar.NAVIGATION_MODE_TABS);
        }
    }

//    public void onTabSelected(ActionBar.Tab tab, FragmentTransaction ft) {
//        // FIXME add a proper implementation, for now just rotate the left
//        // fragment
////        rotateLeftFrag();
//    }
//
//    public void onTabUnselected(ActionBar.Tab tab, FragmentTransaction ft) {
//        // FIXME implement this
//    }
//
//    public void onTabReselected(ActionBar.Tab tab, FragmentTransaction ft) {
//        // FIXME implement this
//    }
    
    
    private final class AnActionModeOfEpicProportions implements ActionMode.Callback {
        @Override
        public boolean onCreateActionMode(ActionMode mode, Menu menu) {
            //Used to put dark icons on light action bar
            boolean isLight = false; //SampleList.THEME == R.style.Theme_Sherlock_Light;

            mode.setTitle("Action Mode");

            menu.add("Star")
                .setIcon(isLight ? R.drawable.ic_menu_star_holo_light : R.drawable.ic_menu_star_holo_dark)
                .setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);

            menu.add("Copy")
                .setIcon(R.drawable.ic_action_copy)
                .setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);
            
            menu.add("Forward")
        		.setIcon(R.drawable.ic_action_fwd)
        		.setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);
            
            menu.add("Tag")
            	.setIcon(R.drawable.ic_action_tag)
            	.setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);
            
            menu.add("Delete")
            	.setIcon(R.drawable.ic_action_delete)
            	.setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);

            menu.add("Search")
                .setIcon(isLight ? R.drawable.ic_menu_star_holo_light : R.drawable.ic_menu_star_holo_dark)
                .setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);

            menu.add("Refresh")
                .setIcon(isLight ? R.drawable.ic_menu_star_holo_light : R.drawable.ic_menu_star_holo_dark)
                .setShowAsAction(MenuItem.SHOW_AS_ACTION_IF_ROOM);

            return true;
        }

        @Override
        public boolean onPrepareActionMode(ActionMode mode, Menu menu) {
            return false;
        }

        @Override
        public boolean onActionItemClicked(ActionMode mode, MenuItem item) {
            Toast.makeText(MainActivityICS.this, "Got click: " + item, Toast.LENGTH_SHORT).show();
            mode.finish();
            return true;
        }

        @Override
        public void onDestroyActionMode(ActionMode mode) {
        }
    }


	@Override
	public void onTabReselected(Tab tab, android.app.FragmentTransaction ft) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void onTabSelected(Tab tab, android.app.FragmentTransaction ft) {
		// TODO Auto-generated method stub
		
	}

	@Override
	public void onTabUnselected(Tab tab, android.app.FragmentTransaction ft) {
		// TODO Auto-generated method stub
		
	}

    

}