# Whartoff - An ActionBarSherlock migration utility
#
# usage: whartoff.sh <option> <project directory>
#
# options:
#   -c : ActionBarSherlock to compatibility ActionBar 
#   -n : ActionBarSherlock to native ActionBar

#!/bin/bash

usage ()
{
    echo "\nusage: $0 <option> <project directory>\n\noptions:\n  -c : ActionBarSherlock to compatibility ActionBar \n  -n : ActionBarSherlock to native ActionBar\n"
    exit 1
}

[ "$1" = "-c" ] || [ "$1" = "-n" ] || usage
[ -n "$2" ] || usage

if [ -f "$2"/AndroidManifest.xml ]; then
    # ant
    SRC_PATH="$2"/src
    RES_PATH="$2"/res
    MAN_PATH="$2"/AndroidManifest.xml
else
    if [ -f "$2"/src/main/AndroidManifest.xml ]; then
        # gradle
        SRC_PATH="$2"/src/main/java
        RES_PATH="$2"/src/main/res
        MAN_PATH="$2"/src/main/AndroidManifest.xml
    else
        echo "$2 does not contain an Android project"
        exit 1
    fi
fi

APP=$(grep "package=" "$MAN_PATH" | cut -d"\"" -f2,2)

VW1="s/com.actionbarsherlock.view.Menu/android.view.Menu/g"
VW2="s/com.actionbarsherlock.view.MenuInflater/android.view.MenuInflater/g"
VW3="s/com.actionbarsherlock.view.MenuItem/android.view.MenuItem/g"
VW4="s/com.actionbarsherlock.view.SubMenu/android.view.SubMenu/g"
VW5="s/com.actionbarsherlock.view.Window/android.view.Window/g"
FR1="s/com.actionbarsherlock.app.SherlockFragment/android.support.v4.app.Fragment/g"
FR2="s/com.actionbarsherlock.app.SherlockListFragment/android.support.v4.app.ListFragment/g"
CL3="s/SherlockFragment/Fragment/g"
CL5="s/SherlockListFragment/ListFragment/g"
CL6="s/SherlockPreferenceActivity/PreferenceActivity/g"
GE1="s/getSupportMenuInflater(/getMenuInflater(/g"
GE2="s/setSupportProgress/setProgress/g"
GE3="s/setSupportSecondaryProgress/setSecondaryProgress/g"

if [ "$1" = "-c" ]; then
    # compat
    AC1="s/com.actionbarsherlock.app.SherlockFragmentActivity/android.support.v7.app.ActionBarActivity/g"
    AC2="s/com.actionbarsherlock.app.SherlockPreferenceActivity/android.preference.PreferenceActivity/g"
    ACT="s/com.actionbarsherlock.view.ActionProvider/android.support.v4.view.ActionProvider/g"
    IMP="s/import com.actionbarsherlock/import android.support.v7/g"
    CL1="s/SherlockActivity/ActionBarActivity/g" 
    CL2="s/SherlockFragmentActivity/ActionBarActivity/g" 
    CL4="s/SherlockListActivity/ActionBarListActivity/g" #???
    THE="s/Theme.Sherlock/Theme.AppCompat/g"
    WID="s/Widget.Sherlock/Widget.AppCompat/g"
    ME1="s/android:showAsAction/app:showAsAction/g"
    ME2='s/<menu/<menu xmlns:app="http:\/\/schemas.android.com\/apk\/res-auto"/g'
    GE4="s/startActionMode(/startSupportActionMode(/g"
    # android.support.v4.view.MenuItemCompat ???
else
    # native
    AC1="s/com.actionbarsherlock.app.SherlockFragmentActivity/android.support.v4.app.FragmentActivity/g"
    AC2="s/com.actionbarsherlock.app.SherlockPreferenceActivity/android.preference.PreferenceActivity/g"
    IMP="s/import com.actionbarsherlock/import android/g"
    CL1="s/SherlockActivity/Activity/g"
    CL2="s/SherlockFragmentActivity/FragmentActivity/g"
    CL4="s/SherlockListActivity/ListActivity/g"
    THE="s/Theme.Sherlock/android:Theme.Holo/g"
    WID="s/Widget.Sherlock/android:Widget.Holo/g"
    GE4="s/getSupportActionBar(/getActionBar(/g"
fi

find "$SRC_PATH" -name "*.java" -print | xargs sed -i "" "$VW1;$VW2;$VW3;$VW4;$VW5;$AC1;$AC2;$ACT;$FR1;$FR2;$IMP;$CL1;$CL2;$CL3;$CL4;$CL5;$CL6;$GE1;$GE2;$GE3;$GE4"
find "$RES_PATH" -name "*.xml" -print | xargs sed -i "" "$THE;$WID;$ME1;$ME2"
find "$MAN_PATH" -print | xargs sed -i "" "$THE"

echo "done!"
