const Dispute = require('../model/disputeModel');
const Report = require('../model/reportModel');
const User = require('../model/userModel');

// Create a new dispute
exports.createDispute = async (req, res) => {
  try {
    const { title, description, category } = req.body;
    const userId = req.user._id;
    const userType = req.user.role === 'seller' ? 'seller' : 'user';

    if (!title || !description || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    // Log the request body for debugging
    console.log('Creating dispute with data:', { title, description, category });

    // Create initial message from user
    const initialMessage = {
      sender: 'user',
      content: description,
      timestamp: Date.now()
    };

    // Create a new dispute document WITHOUT any resolution fields
    const disputeData = {
      title,
      description,
      user: userId,
      userType,
      category,
      messages: [initialMessage]
      // DO NOT include resolution field at all - not even setting it to undefined
    };

    try {
      // Create the dispute document
      const newDispute = new Dispute(disputeData);
      
      // Double check: explicitly set resolution to undefined to avoid validation errors
      newDispute.resolution = undefined;
      
      // Now save
      await newDispute.save();
      
      console.log('Dispute created successfully:', newDispute._id);
      
      res.status(201).json({
        success: true,
        message: 'Dispute created successfully',
        dispute: newDispute
      });
    } catch (saveError) {
      console.error('Database save error:', saveError);
      
      // Provide a more helpful error message
      if (saveError.name === 'ValidationError') {
        return res.status(400).json({
          success: false,
          message: 'Validation error: ' + Object.values(saveError.errors).map(e => e.message).join(', ')
        });
      }
      
      // For other errors, throw to the outer catch
      throw saveError;
    }
  } catch (error) {
    console.error('Error creating dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create dispute. Please try again.',
      error: error.message
    });
  }
};

// Get all disputes (admin only)
exports.getAllDisputes = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { status, category, sort = '-createdAt' } = req.query;
    const query = {};

    // Add filters if provided
    if (status) query.status = status;
    if (category) query.category = category;

    // Log the query for debugging
    console.log('Fetching disputes with query:', query);

    const disputes = await Dispute.find(query)
      .sort(sort)
      .populate('user', 'name email');

    res.status(200).json({
      success: true,
      count: disputes.length,
      disputes: disputes
    });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch disputes',
      error: error.message
    });
  }
};

// Get user disputes
exports.getUserDisputes = async (req, res) => {
  try {
    const userId = req.user._id;
    const disputes = await Dispute.find({ user: userId })
      .sort('-createdAt');

    res.status(200).json({
      success: true,
      count: disputes.length,
      disputes
    });
  } catch (error) {
    console.error('Error fetching user disputes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your disputes',
      error: error.message
    });
  }
};

// Get a single dispute
exports.getDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const dispute = await Dispute.findById(id)
      .populate('user', 'name email');

    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    // Check if user is admin or the dispute owner
    if (req.user.role !== 'admin' && dispute.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own disputes.'
      });
    }

    res.status(200).json({
      success: true,
      dispute
    });
  } catch (error) {
    console.error('Error fetching dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dispute',
      error: error.message
    });
  }
};

// Add message to dispute
exports.addMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { message } = req.body;
    
    if (!message) {
      return res.status(400).json({
        success: false,
        message: 'Message content is required'
      });
    }

    const dispute = await Dispute.findById(id);
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    // Check if user is admin or the dispute owner
    if (req.user.role !== 'admin' && dispute.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only message your own disputes.'
      });
    }

    // Create new message
    const newMessage = {
      sender: req.user.role === 'admin' ? 'admin' : 'user',
      content: message,
      timestamp: Date.now()
    };

    dispute.messages.push(newMessage);
    
    // If admin is replying to a pending dispute, update status to in-progress
    if (req.user.role === 'admin' && dispute.status === 'pending') {
      dispute.status = 'in-progress';
    }
    
    await dispute.save();

    res.status(200).json({
      success: true,
      message: 'Message added successfully',
      dispute
    });
  } catch (error) {
    console.error('Error adding message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add message',
      error: error.message
    });
  }
};

// Update dispute status (admin only)
exports.updateDisputeStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['pending', 'in-progress', 'resolved', 'rejected'];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid status'
      });
    }

    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const dispute = await Dispute.findById(id);
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    dispute.status = status;
    await dispute.save();

    res.status(200).json({
      success: true,
      message: `Dispute status updated to ${status}`,
      dispute
    });
  } catch (error) {
    console.error('Error updating dispute status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update dispute status',
      error: error.message
    });
  }
};

// Resolve dispute and create report (admin only)
exports.resolveDispute = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      resolutionOutcome, 
      resolutionNotes,
      reportTitle,
      reportSummary,
      reportDetails
    } = req.body;
    
    console.log('Request to resolve dispute:', { id, body: req.body });
    
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    // Validate the resolution outcome is one of the allowed values
    const validOutcomes = ['refund', 'replacement', 'information', 'no-action', 'other'];
    if (!resolutionOutcome || !validOutcomes.includes(resolutionOutcome)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid resolution outcome'
      });
    }

    // Find the dispute with populated user
    const dispute = await Dispute.findById(id)
      .populate('user');
    
    if (!dispute) {
      return res.status(404).json({
        success: false,
        message: 'Dispute not found'
      });
    }

    console.log('Resolving dispute:', id, 'with outcome:', resolutionOutcome);
    console.log('Dispute data:', {
      id: dispute._id,
      title: dispute.title,
      category: dispute.category
    });

    // Set resolution data properly according to schema structure
    dispute.status = 'resolved';
    
    // Properly set the resolution object according to schema
    dispute.resolution = {
      outcome: resolutionOutcome,
      notes: resolutionNotes || '',
      completedAt: Date.now()
    };
    
    // Add final resolution message
    dispute.messages.push({
      sender: 'admin',
      content: `Dispute resolved with outcome: ${resolutionOutcome}. ${resolutionNotes || ''}`,
      timestamp: Date.now()
    });
    
    try {
      await dispute.save();
      console.log('Dispute resolved successfully');

      // Create a more detailed title and summary if not provided
      const defaultTitle = `Resolution for: ${dispute.title}`;
      const defaultSummary = `Resolution for ${dispute.category} dispute #${dispute._id.toString().substring(0, 8)}`;
      
      // Create report
      const newReport = new Report({
        title: reportTitle || defaultTitle,
        relatedDispute: dispute._id,
        summary: reportSummary || defaultSummary,
        details: reportDetails || resolutionNotes || 'No additional details provided',
        user: dispute.user._id,
        userType: dispute.userType,
        resolution: resolutionOutcome,
        adminNotes: resolutionNotes || '',
        status: 'needs-feedback',  // Make sure status is set
        category: dispute.category // Include the dispute category
      });
      
      await newReport.save();
      console.log('Report created successfully:', newReport._id);

      // Populate the user in the report for the response
      const populatedReport = await Report.findById(newReport._id)
        .populate('user', 'name email')
        .populate('relatedDispute', 'title category');
      
      res.status(200).json({
        success: true,
        message: 'Dispute resolved and report created',
        dispute: dispute,
        report: populatedReport
      });
    } catch (saveError) {
      console.error('Error saving resolution:', saveError);
      throw saveError;
    }
  } catch (error) {
    console.error('Error resolving dispute:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resolve dispute',
      error: error.message
    });
  }
};

// Get reports for a user
exports.getUserReports = async (req, res) => {
  try {
    const userId = req.user._id;
    const reports = await Report.find({ user: userId })
      .sort('-createdAt')
      .populate('relatedDispute', 'title category');

    res.status(200).json({
      success: true,
      count: reports.length,
      reports
    });
  } catch (error) {
    console.error('Error fetching user reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch your reports',
      error: error.message
    });
  }
};

// Get a single report
exports.getReport = async (req, res) => {
  try {
    const { id } = req.params;
    const report = await Report.findById(id)
      .populate('relatedDispute')
      .populate('user', 'name email');

    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user is admin or the report owner
    if (req.user.role !== 'admin' && report.user._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own reports.'
      });
    }

    res.status(200).json({
      success: true,
      report
    });
  } catch (error) {
    console.error('Error fetching report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch report',
      error: error.message
    });
  }
};

// Add feedback to a report
exports.addReportFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid rating (1-5)'
      });
    }

    const report = await Report.findById(id);
    
    if (!report) {
      return res.status(404).json({
        success: false,
        message: 'Report not found'
      });
    }

    // Check if user is the report owner
    if (report.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only provide feedback on your own reports.'
      });
    }

    report.feedback = {
      rating,
      comment: comment || null,
      submittedAt: Date.now()
    };
    
    report.status = 'completed';
    await report.save();

    res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully',
      report
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit feedback',
      error: error.message
    });
  }
};

// Get all reports (admin only)
exports.getAllReports = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin only.'
      });
    }

    const { status, resolution, sort = '-createdAt' } = req.query;
    const query = {};

    // Add filters if provided
    if (status) query.status = status;
    if (resolution) query.resolution = resolution;

    console.log('Fetching reports with query:', query);
    
    // Get the reports
    const reports = await Report.find(query)
      .sort(sort)
      .populate('user', 'name email')
      .populate('relatedDispute', 'title category status');
      
    // Format the reports with additional information
    const formattedReports = reports.map(report => {
      // Convert to a plain object for modification
      const formatted = report.toObject();
      
      // Add additional fields or fix missing fields
      if (!formatted.status) formatted.status = 'pending';
      if (!formatted.resolution) formatted.resolution = 'unknown';
      
      // Add formatted dates
      formatted.createdAtFormatted = new Date(report.createdAt).toLocaleString();
      if (report.feedback && report.feedback.submittedAt) {
        formatted.feedback.submittedAtFormatted = new Date(report.feedback.submittedAt).toLocaleString();
      }
      
      // Add dispute information if available
      if (report.relatedDispute) {
        formatted.disputeTitle = report.relatedDispute.title;
        formatted.disputeCategory = report.relatedDispute.category;
        formatted.disputeStatus = report.relatedDispute.status;
      }
      
      return formatted;
    });

    console.log(`Found ${formattedReports.length} reports`);
    
    res.status(200).json({
      success: true,
      count: formattedReports.length,
      reports: formattedReports
    });
  } catch (error) {
    console.error('Error fetching reports:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports',
      error: error.message
    });
  }
}; 