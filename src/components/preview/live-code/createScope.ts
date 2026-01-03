import React from "react";

// Pre-imported components that generated code can use
import * as UICard from "@/components/ui/card";
import * as UIButton from "@/components/ui/button";
import * as UIInput from "@/components/ui/input";
import * as UITabs from "@/components/ui/tabs";
import * as UIProgress from "@/components/ui/progress";
import * as UIBadge from "@/components/ui/badge";
import * as UIAlert from "@/components/ui/alert";
import * as UISelect from "@/components/ui/select";
import * as UICheckbox from "@/components/ui/checkbox";
import * as UISwitch from "@/components/ui/switch";
import * as UILabel from "@/components/ui/label";
import * as UITextarea from "@/components/ui/textarea";
import * as UIDialog from "@/components/ui/dialog";
import * as UITable from "@/components/ui/table";
import * as UIScrollArea from "@/components/ui/scroll-area";
import * as UIAvatar from "@/components/ui/avatar";
import * as UIAccordion from "@/components/ui/accordion";
import * as LucideIcons from "lucide-react";

// Create a scope with all available components
export const createLiveCodeScope = () => ({
  React,
  useState: React.useState,
  useEffect: React.useEffect,
  useCallback: React.useCallback,
  useMemo: React.useMemo,
  useRef: React.useRef,
  // UI Components
  ...UICard,
  ...UIButton,
  ...UIInput,
  ...UITabs,
  ...UIProgress,
  ...UIBadge,
  ...UIAlert,
  ...UISelect,
  ...UICheckbox,
  ...UISwitch,
  ...UILabel,
  ...UITextarea,
  ...UIDialog,
  ...UITable,
  ...UIScrollArea,
  ...UIAvatar,
  ...UIAccordion,
  // All Lucide Icons
  ...LucideIcons,
});
